#!/bin/bash
# ==============================================================================
# PanelMaster - Automated Let's Encrypt SSL / HTTPS Setup
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ==============================================================
             PanelMaster - Configuración de Certificado SSL     
  ==============================================================
EOF
echo -e "${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[Error] Este script debe ejecutarse como root o con sudo.${NC}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# 1. Obtenemos dominio y correo
PANEL_DOMAIN="$1"
ADMIN_EMAIL="$2"

if [ -f ".env" ]; then
  ENV_DOMAIN=$(grep '^PANEL_DOMAIN=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || true)
  ENV_EMAIL=$(grep '^INITIAL_ADMIN_EMAIL=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || true)
fi

if [ -z "$PANEL_DOMAIN" ]; then
  DEFAULT_DOMAIN="${ENV_DOMAIN:-panel.zenforge.online}"
  read -rp "$(echo -e "${CYAN}Ingresa tu dominio FQDN [${DEFAULT_DOMAIN}]: ${NC}")" INPUT_DOMAIN
  PANEL_DOMAIN="${INPUT_DOMAIN:-$DEFAULT_DOMAIN}"
fi

if [ -z "$ADMIN_EMAIL" ]; then
  DEFAULT_EMAIL="${ENV_EMAIL:-admin@${PANEL_DOMAIN}}"
  read -rp "$(echo -e "${CYAN}Correo para Let's Encrypt [${DEFAULT_EMAIL}]: ${NC}")" INPUT_EMAIL
  ADMIN_EMAIL="${INPUT_EMAIL:-$DEFAULT_EMAIL}"
fi

echo -e "${YELLOW}[*] Dominio configurado: ${BOLD}${PANEL_DOMAIN}${NC}"
echo -e "${YELLOW}[*] Correo registrado:   ${BOLD}${ADMIN_EMAIL}${NC}"

# 2. Instalar Certbot
echo -e "${CYAN}[1/4] Instalando Certbot...${NC}"
if command -v apt-get &> /dev/null; then
  apt-get update -y -q
  apt-get install -y -q certbot
elif command -v dnf &> /dev/null; then
  dnf install -y -q certbot
elif command -v yum &> /dev/null; then
  yum install -y -q certbot
fi

# 3. Liberar puerto 80 temporalmente para validación standalone
echo -e "${CYAN}[2/4] Deteniendo servicio web momentáneamente para validar dominio...${NC}"
docker compose stop web 2>/dev/null || docker-compose stop web 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true

# 4. Obtener Certificado SSL
echo -e "${CYAN}[3/4] Solicitando certificado a Let's Encrypt...${NC}"
certbot certonly --standalone \
  -d "${PANEL_DOMAIN}" \
  --non-interactive \
  --agree-tos \
  -m "${ADMIN_EMAIL}" \
  --preferred-challenges http

CERT_PATH="/etc/letsencrypt/live/${PANEL_DOMAIN}/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/${PANEL_DOMAIN}/privkey.pem"

if [ ! -f "${CERT_PATH}" ]; then
  echo -e "${RED}[Error] No se pudo generar el certificado SSL. Verifica que el dominio ${PANEL_DOMAIN} apunte a la IP de este servidor.${NC}"
  docker compose start web 2>/dev/null || docker-compose start web 2>/dev/null || true
  exit 1
fi

# 5. Configurar Nginx con HTTPS
echo -e "${CYAN}[4/4] Aplicando configuración HTTPS y redirección 301 en Nginx...${NC}"
mkdir -p "${SCRIPT_DIR}/nginx/conf.d"

cat > "${SCRIPT_DIR}/nginx/conf.d/default.conf" << EOF
# Redirección automática de HTTP a HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}

# Servidor seguro HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/${PANEL_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${PANEL_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to backend Fastify container
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Proxy WebSockets for Terminal Console & live metrics
    location /ws {
        proxy_pass http://api:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto https;
    }

    # SPA routing fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Actualizar variables en .env
if [ -f ".env" ]; then
  if grep -q "^SSL_CERTS_DIR=" .env; then
    sed -i 's|^SSL_CERTS_DIR=.*|SSL_CERTS_DIR=/etc/letsencrypt|' .env
  else
    echo "SSL_CERTS_DIR=/etc/letsencrypt" >> .env
  fi

  if grep -q "^PANEL_DOMAIN=" .env; then
    sed -i "s|^PANEL_DOMAIN=.*|PANEL_DOMAIN=${PANEL_DOMAIN}|" .env
  else
    echo "PANEL_DOMAIN=${PANEL_DOMAIN}" >> .env
  fi
fi

# Configurar Firewall para puerto 443
if command -v ufw &> /dev/null; then
  ufw allow 443/tcp >/dev/null 2>&1 || true
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=443/tcp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi

# Configurar hook de renovación automática
mkdir -p /etc/letsencrypt/renewal-hooks/post
cat > /etc/letsencrypt/renewal-hooks/post/panelmaster-reload.sh << EOF
#!/bin/bash
cd "${SCRIPT_DIR}" && docker compose restart web || docker-compose restart web
EOF
chmod +x /etc/letsencrypt/renewal-hooks/post/panelmaster-reload.sh

# Levantar contenedores
docker compose up -d
docker compose restart web

echo -e "\n${GREEN}${BOLD}==============================================================${NC}"
echo -e "${GREEN}${BOLD}   ¡CERTIFICADO SSL / HTTPS CONFIGURADO EXITOSAMENTE!         ${NC}"
echo -e "${GREEN}${BOLD}==============================================================${NC}\n"
echo -e "Accede a tu panel de manera segura en:"
echo -e "  ${CYAN}${BOLD}https://${PANEL_DOMAIN}${NC}\n"
