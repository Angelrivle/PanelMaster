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

if [ -d ".git" ]; then
  git pull origin main || git pull
fi

echo -e "${YELLOW}[*] Reconstruyendo contenedores de producción...${NC}"
docker compose build
docker compose up -d --remove-orphans

echo -e "${YELLOW}[*] Sincronizando esquema de base de datos...${NC}"
sleep 4
docker compose exec -T api npx prisma db push || true
docker compose restart api || true

echo -e "${GREEN}${BOLD}[✓] ¡PanelMaster ha sido actualizado exitosamente!${NC}"
