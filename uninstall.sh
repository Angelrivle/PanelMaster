#!/usr/bin/env bash
set -euo pipefail

read -rp "¿Estás completamente seguro de que deseas desinstalar NexusPanel? Esta acción borrará todos los servicios y datos (s/N): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
  echo "Desinstalación abortada."
  exit 0
fi

INSTALL_DIR="/opt/nexuspanel"
DATA_DIR="/var/lib/nexuspanel"

echo "Deteniendo y eliminando contenedores..."
if [ -d "$INSTALL_DIR" ]; then
  cd "$INSTALL_DIR"
  docker compose -f docker-compose.prod.yml down -v || true
fi

echo "Desactivando servicio systemd del agente..."
systemctl stop nexus-agent || true
systemctl disable nexus-agent || true
rm -f /etc/systemd/system/nexus-agent.service
systemctl daemon-reload

echo "Limpiando directorios de instalación y datos..."
rm -rf "$INSTALL_DIR"
rm -rf "$DATA_DIR"

echo "✓ NexusPanel ha sido desinstalado completamente del sistema."
