#!/bin/bash
# ==============================================================================
# PanelMaster - Automated Updater
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}[*] Actualizando PanelMaster a la última versión...${NC}"

# Ensure firewall allows SFTP (Port 2022)
if command -v ufw &> /dev/null; then
  ufw allow 2022/tcp >/dev/null 2>&1 || true
fi
if command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=2022/tcp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi

# Pull latest commits
if [ -d ".git" ]; then
  git pull origin main || git pull
fi

echo -e "${YELLOW}[*] Reconstruyendo contenedores de producción...${NC}"
docker compose build || docker-compose build
docker compose up -d --remove-orphans || docker-compose up -d --remove-orphans

echo -e "${YELLOW}[*] Sincronizando esquema de base de datos...${NC}"
sleep 4
docker compose exec -T api npx prisma db push --accept-data-loss || docker-compose exec -T api npx prisma db push --accept-data-loss || true
docker compose restart api || docker-compose restart api || true

echo -e "${GREEN}${BOLD}[✓] ¡PanelMaster ha sido actualizado exitosamente!${NC}"
