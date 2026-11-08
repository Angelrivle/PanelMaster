# NexusPanel - Documento de Arquitectura de Sistema

## 1. Visión y Justificación del Enfoque Arquitectónico

NexusPanel implementa un enfoque de **Modular Monolith desplegable como Microservicios**.

### Justificación de la decisión:
- **Pterodactyl** históricamente adoleció de una acopladura monolítica en PHP (Laravel) con un daemon separado en Go (Wings). El panel central resultaba lento para manejar miles de conexiones WebSocket y eventos asíncronos en tiempo real.
- Adoptar una división pura de decenas de microservicios independientes desde el día 1 incrementa innecesariamente la latencia de red en despliegues pequeños (VPS o servidores homelab de un solo nodo).
- **La solución adoptada en NexusPanel:** Un **Control Plane modular en TypeScript/Fastify** altamente optimizado para E/S asíncrona no bloqueante, y un **Node Agent nativo en Go** ultraligero que se comunica de forma asíncrona mediante mTLS / WebSockets seguros.
- Si el Control Plane (Panel) se cae o se reinicia por mantenimiento, los servicios de los usuarios continúan ejecutándose ininterrumpidamente en los nodos de ejecución (`systemd + dockerd`).

---

## 2. Diagrama de Arquitectura de Componentes

```
+-----------------------------------------------------------------------------------+
|                                 CLIENTES / USUARIOS                               |
|       Navegador Web (SPA React + Monaco + xterm.js)  /  CI/CD / API Clients       |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS
                                           v
+-----------------------------------------------------------------------------------+
|                        REVERSE PROXY & GATEWAY (Caddy / Nginx)                    |
|             Terminación TLS (Let's Encrypt), Rate-Limiting, HTTP/2 & HTTP/3       |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                         NEXUS CONTROL PLANE (Core API)                            |
|                                                                                   |
|  [Auth & RBAC Service]   [Service LifeCycle Manager]   [Scheduler / Orchestrator] |
|  [Template Registry]     [Domain & Proxy Manager]      [Audit & Metrics Collector]|
|                                                                                   |
|  Persistencia:                                                                    |
|  - PostgreSQL 16 (Relational state, organizations, RBAC, services, ports)         |
|  - Redis / Valkey 7 (Token blacklist, distributed locks, rate-limiting, queues)   |
+------------------------------------------+----------------------------------------+
                                           |
           +-------------------------------+-------------------------------+
           | mTLS / Secure WebSocket Tunnel (Comandos, Telemetría, WebTTY)  |
           v                                                               v
+----------------------+                                        +----------------------+
| NODE 1 (Región: Lima)|                                        | NODE 2 (Región: US)  |
|                      |                                        |                      |
| [Nexus Agent (Go)]   |                                        | [Nexus Agent (Go)]   |
|   ├── SafeFS Engine  |                                        |   ├── SafeFS Engine  |
|   ├── PTY Terminal   |                                        |   ├── PTY Terminal   |
|   └── Metrics Scraper|                                        |   └── Metrics Scraper|
|           |          |                                        |           |          |
|    Docker Engine     |                                        |    Docker Engine     |
|  +-----------------+ |                                        |  +-----------------+ |
|  | Contenedor A    | |                                        |  | Contenedor X    | |
|  | Minecraft Paper | |                                        |  | Discord Bot     | |
|  +-----------------+ |                                        |  +-----------------+ |
|  +-----------------+ |                                        |  +-----------------+ |
|  | Contenedor B    | |                                        |  | Contenedor Y    | |
|  | PostgreSQL DB   | |                                        |  | Web App Node.js | |
|  +-----------------+ |                                        |  +-----------------+ |
+----------------------+                                        +----------------------+
```

---

## 3. Capas del Sistema y Responsabilidades

1. **Nexus Web SPA:**
   - Construido con React 18+, TypeScript y Tailwind CSS.
   - Monaco Editor embebido para edición sintáctica de archivos `.json`, `.properties`, `.yaml`, `.env`.
   - xterm.js conectado directamente mediante túnel WebSocket bidireccional para emulación VT100 / ANSI de terminal.

2. **Nexus Control Plane (Core API):**
   - Construido con Fastify en Node.js 20+.
   - Manejo de autenticación: Access Token JWT de 15 minutos + Refresh Token rotativo en base de datos.
   - Autenticación multifactor (2FA) obligatoria con TOTP RFC 6238 y códigos de recuperación.
   - Orquestador inteligente de nodos: calcula afinidad de región, capacidad de CPU/RAM, sobreasignación (overcommit) y disponibilidad de rangos de puertos.

3. **Nexus Node Agent (Daemon en Go):**
   - Daemon de alto rendimiento compilado estáticamente.
   - Consume menos de 30 MB de RAM en reposo.
   - Acceso directo a la API de Docker mediante `github.com/docker/docker/client`.
   - Aplica límites de cgroups v2 (`Memory`, `NanoCPUs`, `PidsLimit`, `BlkioWeight`, `no-new-privileges:true`).
   - Módulo `SafeFS` para operaciones atómicas de archivos con mitigación contra ataques de Path Traversal y enlaces simbólicos maliciosos.
