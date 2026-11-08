#!/bin/bash
# ==============================================================================
# PanelMaster - Automated VPS Installer
# Supported OS: Ubuntu 20.04/22.04/24.04, Debian 11/12, AlmaLinux/Rocky 8/9
# ==============================================================================

set -e

# Terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

# ASCII Banner
echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ____                 _ __  __           _            
 |  _ \ __ _ _ __   __| |  \/  | __ _ ___| |_ ___ _ __ 
 | |_) / _` | '_ \ / _` | |\/| |/ _` / __| __/ _ \ '__|
 |  __/ (_| | | | | (_| | |  | | (_| \__ \ ||  __/ |   
 |_|   \__,_|_| |_|\__,_|_|  |_|\__,_|___/\__\___|_|   
                     NEXT-GEN GAME CLOUD PANEL
EOF
echo -e "${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BOLD}       Instalador Oficial de PanelMaster para Servidores VPS          ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Este script debe ejecutarse con privilegios de root.${NC}"
  echo -e "Por favor ejecuta: ${YELLOW}sudo bash $0${NC} o entra como root con ${YELLOW}sudo -i${NC}."
  exit 1
fi

# 2. OS Detection
echo -e "${CYAN}[*] Detectando sistema operativo...${NC}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$ID
  OS_VERSION=$VERSION_ID
  CODENAME=$VERSION_CODENAME
  [ -z "$CODENAME" ] && CODENAME=$(echo "$VERSION" | grep -oP '\(\K[^\)]+' || echo "focal")
else
  echo -e "${RED}[ERROR] No se pudo determinar la distribución de Linux.${NC}"
  exit 1
fi

echo -e "${GREEN}[✓] Sistema detectado: ${OS_NAME} ${OS_VERSION} (${CODENAME})${NC}"
echo ""

# 3. Interactive Setup Prompts
echo -e "${YELLOW}${BOLD}--- CONFIGURACIÓN INICIAL DEL PANEL ---${NC}"

# Detect server public IP
PUBLIC_IP=$(curl -s4 https://api.ipify.org || curl -s4 https://icanhazip.com || echo "127.0.0.1")

read -rp "$(echo -e "${CYAN}Ingresa el dominio o FQDN del panel [deja vacío para usar IP ${PUBLIC_IP}]: ${NC}")" PANEL_DOMAIN
if [ -z "$PANEL_DOMAIN" ]; then
  PANEL_DOMAIN="${PUBLIC_IP}"
  USE_SSL="n"
else
  read -rp "$(echo -e "${CYAN}¿Deseas generar certificados SSL automáticos con Let's Encrypt (Certbot)? [s/N]: ${NC}")" USE_SSL
fi

read -rp "$(echo -e "${CYAN}Correo del Administrador Inicial [admin@panelmaster.dev]: ${NC}")" ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@panelmaster.dev}

read -rsp "$(echo -e "${CYAN}Contraseña para el Administrador Inicial [deja vacío para autogenerar]: ${NC}")" ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD=$(openssl rand -base64 12)
  echo -e "${YELLOW}[!] Contraseña autogenerada: ${BOLD}${ADMIN_PASSWORD}${NC}"
fi

read -rp "$(echo -e "${CYAN}Puerto HTTP del Panel Web [80]: ${NC}")" WEB_PORT
WEB_PORT=${WEB_PORT:-80}

INSTALL_DIR="/var/www/panelmaster"
echo ""
echo -e "${CYAN}[*] Directorio de instalación: ${BOLD}${INSTALL_DIR}${NC}"
echo ""

# 4. Dependency Installation
echo -e "${CYAN}[1/6] Actualizando paquetes del sistema e instalando herramientas...${NC}"

if [[ "$OS_NAME" == "ubuntu" || "$OS_NAME" == "debian" ]]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y -q
  apt-get install -y -q curl wget git openssl jq tar ufw ca-certificates gnupg lsb-release apt-transport-https
elif [[ "$OS_NAME" == "almalinux" || "$OS_NAME" == "rocky" || "$OS_NAME" == "centos" ]]; then
  yum install -y -q curl wget git openssl jq tar firewalld ca-certificates
fi

# 5. Docker & Docker Compose Installation (Focal/Jammy/Noble/Debian compatible)
echo -e "${CYAN}[2/6] Verificando e instalando Docker Engine y Docker Compose Plugin...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}[*] Configurando repositorio oficial de Docker...${NC}"
  if [[ "$OS_NAME" == "ubuntu" || "$OS_NAME" == "debian" ]]; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${OS_NAME}/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_NAME} ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -y -q
    # Explicitly install packages, omitting obsolete or unsupported packages like docker-model-plugin
    apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || apt-get install -y -q docker.io docker-compose
  elif [[ "$OS_NAME" == "almalinux" || "$OS_NAME" == "rocky" || "$OS_NAME" == "centos" ]]; then
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || dnf install -y docker docker-compose
  else
    curl -fsSL https://get.docker.com | sh || true
  fi
  systemctl enable --now docker || service docker start || true
else
  echo -e "${GREEN}[✓] Docker ya está instalado ($(docker --version))${NC}"
fi

# Ensure docker compose CLI is functional
if ! docker compose version &> /dev/null; then
  echo -e "${YELLOW}[*] Instalando plugin Docker Compose v2...${NC}"
  DOCKER_CLI_DIR="/usr/local/lib/docker/cli-plugins"
  mkdir -p "${DOCKER_CLI_DIR}"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) COMPOSE_ARCH="x86_64" ;;
    aarch64) COMPOSE_ARCH="aarch64" ;;
    armv7l) COMPOSE_ARCH="armv7" ;;
    *) COMPOSE_ARCH="x86_64" ;;
  esac
  curl -SL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-${COMPOSE_ARCH}" -o "${DOCKER_CLI_DIR}/docker-compose"
  chmod +x "${DOCKER_CLI_DIR}/docker-compose"
  ln -sf "${DOCKER_CLI_DIR}/docker-compose" /usr/local/bin/docker-compose || true
fi

# 6. Cloning/Preparing Files
echo -e "${CYAN}[3/6] Desplegando archivos de PanelMaster en ${INSTALL_DIR}...${NC}"

mkdir -p "${INSTALL_DIR}"

if [ ! -f "${INSTALL_DIR}/docker-compose.yml" ]; then
  echo -e "${YELLOW}[*] Descargando archivos de PanelMaster desde GitHub...${NC}"
  rm -rf /tmp/panelmaster-repo
  git clone https://github.com/Angelrivle/PanelMaster.git /tmp/panelmaster-repo
  cp -rf /tmp/panelmaster-repo/. "${INSTALL_DIR}/"
  rm -rf /tmp/panelmaster-repo
fi

cd "${INSTALL_DIR}"

# 7. Generate Random Secrets
echo -e "${CYAN}[4/6] Generando claves criptográficas y archivo .env...${NC}"

JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
MASTER_ENCRYPTION_KEY=$(openssl rand -hex 16) # 32 chars

cat > "${INSTALL_DIR}/.env" << EOF
# ==============================================================================
# PanelMaster Production Environment
# Generated on: $(date)
# ==============================================================================
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# Security & Tokens
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1d
MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}

# Database & Cache
POSTGRES_USER=nexus
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=nexuspanel
DATABASE_URL=postgresql://nexus:${POSTGRES_PASSWORD}@postgres:5432/nexuspanel?schema=public
REDIS_URL=redis://redis:6379

# Panel URLs
PANEL_URL=http://${PANEL_DOMAIN}:${WEB_PORT}
API_URL=http://${PANEL_DOMAIN}:3000

# Initial Admin Seed
INITIAL_ADMIN_EMAIL=${ADMIN_EMAIL}
INITIAL_ADMIN_PASSWORD=${ADMIN_PASSWORD}

# SMTP Defaults
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_ENCRYPTION=TLS
SMTP_USER=resend
SMTP_FROM_NAME=PanelMaster
SMTP_FROM_EMAIL=onboarding@resend.dev
EOF

# 8. Firewall configuration
echo -e "${CYAN}[5/6] Configurando reglas de firewall...${NC}"
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow "${WEB_PORT}"/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 3000/tcp >/dev/null 2>&1 || true
  ufw allow 25565/tcp >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port="${WEB_PORT}"/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port=443/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port=3000/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port=25565/tcp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi

# 9. Build & Start Containers
echo -e "${CYAN}[6/6] Iniciando microservicios con Docker Compose...${NC}"
cd "${INSTALL_DIR}"

if docker compose version &>/dev/null; then
  docker compose down --remove-orphans >/dev/null 2>&1 || true
  docker compose up -d --build
  sleep 10
  docker compose exec -T api npx prisma db push --accept-data-loss || true
else
  docker-compose down --remove-orphans >/dev/null 2>&1 || true
  docker-compose up -d --build
  sleep 10
  docker-compose exec -T api npx prisma db push --accept-data-loss || true
fi

# Summary & Output
clear
echo -e "${GREEN}${BOLD}"
cat << "EOF"
  ==============================================================
         ¡INSTALACIÓN DE PANELMASTER COMPLETADA CON ÉXITO!       
  ==============================================================
EOF
echo -e "${NC}"
echo -e "${BOLD}Accede a tu panel en:${NC}"
if [[ "$WEB_PORT" == "80" ]]; then
  echo -e "  ${CYAN}${BOLD}http://${PANEL_DOMAIN}${NC}"
else
  echo -e "  ${CYAN}${BOLD}http://${PANEL_DOMAIN}:${WEB_PORT}${NC}"
fi
echo ""
echo -e "${BOLD}Credenciales del Administrador Principal:${NC}"
echo -e "  Correo:     ${YELLOW}${ADMIN_EMAIL}${NC}"
echo -e "  Contraseña: ${YELLOW}${ADMIN_PASSWORD}${NC}"
echo ""
echo -e "${BOLD}Archivos y Control del Panel:${NC}"
echo -e "  Directorio: ${CYAN}${INSTALL_DIR}${NC}"
echo -e "  Ver logs:   ${CYAN}cd ${INSTALL_DIR} && docker compose logs -f${NC}"
echo -e "  Reiniciar:  ${CYAN}cd ${INSTALL_DIR} && docker compose restart${NC}"
echo -e "  Actualizar: ${CYAN}cd ${INSTALL_DIR} && bash update.sh${NC}"
echo ""
echo -e "${GREEN}Guarda estas credenciales en un lugar seguro.${NC}"
echo -e "${BLUE}==============================================================${NC}"
