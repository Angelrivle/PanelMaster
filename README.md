# PanelMaster 🚀
> Plataforma cloud-native de hosting y orquestación de servidores de juegos, aplicaciones web, bots de Discord y bases de datos.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Engine-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Características Principales

- **Multi-Tenant & Multi-Nodo:** Diseñado para operar en clústeres distribuidos por regiones o en un único VPS.
- **Rendimiento superior para Juegos:** Asignación dinámica de puertos UDP/TCP, monitoreo de CPU/RAM en tiempo real, optimización de baja latencia y pre-calentamiento de capas Docker.
- **Catálogo Completo de Eggs (Workloads):**
  - **Minecraft:** PaperMC (Java 21/17/11/8), Purpur, Fabric, Forge, NeoForge, Velocity/BungeeCord, Bedrock BDS.
  - **Steam & Source Games:** Counter-Strike 2 (CS2), Rust (con soporte Oxide/Carbon), Terraria (tModLoader/Vanilla), Palworld.
  - **Voice & Bots:** Discord Bot (Node.js 20 LTS), Discord Bot (Python 3.11).
  - **Bases de Datos & Web:** PostgreSQL 16, MariaDB / MySQL 8.0, Redis / Valkey Cache, Nginx Web Server.
- **Consola Web en Tiempo Real:** Emulador VT100 / ANSI interactivo impulsado por `xterm.js` con túnel WebSocket seguro.
- **Editor Monaco Embebido:** Experiencia de edición de archivos de configuración tipo VS Code en el navegador, con resaltado de sintaxis, autoguardado y papelera segura.
- **Theme Studio & Personalización:** Diseños minimalistas en paleta oscura con variables CSS dinámicas y editor visual en tiempo real.
- **Motor de Correo Transaccional:** Integración oficial con Resend y SMTP (Nodemailer) para restablecimiento de contraseñas, activación de cuentas y notificaciones de servidores.

---

## ⚡ Instalación en VPS con un solo comando

Para instalar PanelMaster en cualquier servidor VPS virgen con Ubuntu 20.04/22.04/24.04 LTS, Debian 11/12, AlmaLinux o Rocky Linux:

```bash
bash <(curl -sSL https://raw.githubusercontent.com/Angelrivle/PanelMaster/main/install.sh)
```

O clonando el repositorio manualmente:

```bash
git clone https://github.com/Angelrivle/PanelMaster.git /var/www/panelmaster
cd /var/www/panelmaster
sudo bash install.sh
```

### Actualización automática:

```bash
cd /var/www/panelmaster
sudo bash update.sh
```

---

## 🛠️ Estructura del Proyecto

```text
PanelMaster/
├── docker-compose.yml           # Orquestación con Docker Compose
├── install.sh                   # Script de instalación automatizado tipo Pterodactyl
├── update.sh                    # Script de actualización de versiones
├── uninstall.sh                 # Script de desinstalación limpia
├── apps/
│   ├── web/                     # Frontend SPA React + Vite + Tailwind + Monaco + xterm.js
│   └── api/                     # Backend Core API Fastify + Prisma + Redis + Mail Service
└── docs/                        # Arquitectura y guías
```

---

## 🚀 Despliegue con Docker Compose

```bash
docker compose up -d --build
```

El panel estará disponible de inmediato en:
- **Web UI:** `http://localhost:5173` o el puerto configurado (80/443 en VPS).
- **API Core:** `http://localhost:3000`.
