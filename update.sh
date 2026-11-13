#!/bin/bash
# ==============================================================================
# PanelMaster - Automated Updater (Host-Hardened)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}[*] Actualizando PanelMaster a la última versión...${NC}"

# 1. Resolve installation directory automatically (supports running via curl | sudo bash from any dir)
if [ ! -f "docker-compose.yml" ]; then
  if [ -d "/var/www/panelmaster" ] && [ -f "/var/www/panelmaster/docker-compose.yml" ]; then
    cd /var/www/panelmaster
  elif [ -d "/opt/panelmaster" ] && [ -f "/opt/panelmaster/docker-compose.yml" ]; then
    cd /opt/panelmaster
  else
    echo -e "${RED}[ERROR] No se encontró docker-compose.yml ni en /var/www/panelmaster ni en /opt/panelmaster.${NC}"
    exit 1
  fi
fi

INSTALL_DIR=$(pwd)
echo -e "${CYAN}[*] Directorio de instalación detectado: ${BOLD}${INSTALL_DIR}${NC}"

# 2. Host Swap Protection (prevents OOM stalls and SSH drops during builds/pulls)
SWAP_MB=$(free -m | awk '/^Swap:/ {print $2}')
if [ "${SWAP_MB:-0}" -eq 0 ] && [ ! -f /swapfile ]; then
  echo -e "${YELLOW}[*] Configurando archivo Swap de 2GB para proteger la estabilidad del VPS...${NC}"
  (fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none)
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
  if ! grep -q '^vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
  fi
  echo -e "${GREEN}[✓] Swap de 2GB activado.${NC}"
fi

# 3. Docker Daemon I/O Throttling (prevents concurrent layer pulls from starving SSH/disk)
mkdir -p /etc/docker
NEED_DOCKER_RELOAD=0
if [ ! -f /etc/docker/daemon.json ] || ! grep -q 'max-concurrent-downloads' /etc/docker/daemon.json 2>/dev/null; then
  cat > /etc/docker/daemon.json << 'EOF'
{
  "max-concurrent-downloads": 1,
  "max-concurrent-uploads": 1,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
  NEED_DOCKER_RELOAD=1
fi
if [ "$NEED_DOCKER_RELOAD" -eq 1 ]; then
  echo -e "${YELLOW}[*] Aplicando límites de I/O al daemon de Docker (max-concurrent-downloads=1)...${NC}"
  systemctl reload docker >/dev/null 2>&1 || true
fi

# 4. Ensure firewall allows SFTP (Port 2022) and game ports
if command -v ufw &> /dev/null; then
  ufw allow 2022/tcp >/dev/null 2>&1 || true
  ufw allow 25565:25600/tcp >/dev/null 2>&1 || true
  ufw allow 25565:25600/udp >/dev/null 2>&1 || true
fi
if command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=2022/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port=25565-25600/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port=25565-25600/udp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi

# 5. Pull latest commits (or sync cleanly if .git was not preserved)
echo -e "${YELLOW}[*] Sincronizando código fuente desde GitHub...${NC}"
if [ -d ".git" ]; then
  git fetch --all -q
  git reset --hard origin/main -q
else
  rm -rf /tmp/panelmaster-update
  git clone --depth 1 https://github.com/Angelrivle/PanelMaster.git /tmp/panelmaster-update
  if [ -f "${INSTALL_DIR}/.env" ]; then
    cp "${INSTALL_DIR}/.env" /tmp/panelmaster-update/.env
  fi
  cp -rf /tmp/panelmaster-update/. "${INSTALL_DIR}/"
  rm -rf /tmp/panelmaster-update
fi

# 6. Low-priority sequential build so SSH and running containers retain CPU & I/O priority
echo -e "${YELLOW}[*] Reconstruyendo contenedores de producción secuencialmente (baja prioridad I/O)...${NC}"
nice -n 15 ionice -c 2 -n 7 env COMPOSE_PARALLEL_LIMIT=1 docker compose build api || nice -n 15 ionice -c 2 -n 7 env COMPOSE_PARALLEL_LIMIT=1 docker-compose build api
nice -n 15 ionice -c 2 -n 7 env COMPOSE_PARALLEL_LIMIT=1 docker compose build web || nice -n 15 ionice -c 2 -n 7 env COMPOSE_PARALLEL_LIMIT=1 docker-compose build web
docker compose up -d --remove-orphans || docker-compose up -d --remove-orphans

# 7. Database sync & API restart
echo -e "${YELLOW}[*] Sincronizando esquema de base de datos...${NC}"
sleep 4
docker compose exec -T api npx prisma db push --accept-data-loss || docker-compose exec -T api npx prisma db push --accept-data-loss || true
docker compose restart api || docker-compose restart api || true

echo -e "${GREEN}${BOLD}[✓] ¡PanelMaster ha sido actualizado exitosamente!${NC}"
