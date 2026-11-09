#!/bin/sh
set -e

DOMAIN="${PANEL_DOMAIN}"
CERT_DIR=""

if [ -n "$DOMAIN" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
elif [ -d "/etc/letsencrypt/live" ]; then
    # Auto-detect first valid domain directory in /etc/letsencrypt/live
    for d in /etc/letsencrypt/live/*; do
        if [ -d "$d" ] && [ -f "$d/fullchain.pem" ]; then
            CERT_DIR="$d"
            break
        fi
    done
fi

if [ -n "$CERT_DIR" ]; then
    echo "[*] Found SSL certificate at $CERT_DIR! Activating HTTPS & Port 443..."
    cat > /etc/nginx/conf.d/default.conf << EOF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}

# Production HTTPS server
server {
    listen 443 ssl;
    http2 on;
    server_name _;

    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root /usr/share/nginx/html;
    index index.html;

    # API Proxy & WebSocket Gateway
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Legacy WebSocket Proxy
    location /ws {
        proxy_pass http://api:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA Fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
else
    echo "[*] No SSL certificate found. Serving standard HTTP on Port 80..."
    cat > /etc/nginx/conf.d/default.conf << EOF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # API Proxy & WebSocket Gateway
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Legacy WebSocket Proxy
    location /ws {
        proxy_pass http://api:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA Fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

echo "[*] Starting Nginx daemon..."
exec nginx -g "daemon off;"
