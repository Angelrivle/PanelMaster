# NexusPanel - Especificación de API REST v1 & WebSockets

## Resumen de Endpoints Principales

Todos los endpoints REST están versionados bajo el prefijo `/api/v1`.

### Autenticación & Usuarios
- `POST /api/v1/auth/register` - Registro de usuario inicial o nuevo tenant.
- `POST /api/v1/auth/login` - Autenticación con email/contraseña y verificación 2FA opcional.
- `POST /api/v1/auth/refresh` - Rotación de token de sesión.
- `POST /api/v1/auth/2fa/setup` - Generación de clave secreta TOTP y código QR.
- `POST /api/v1/auth/2fa/verify` - Validación y activación de autenticación en dos pasos.

### Nodos de Cómputo (Node Management)
- `GET /api/v1/nodes` - Lista todos los nodos registrados, estado y recursos asignados.
- `POST /api/v1/nodes/register` - Registro administrativo de un nuevo servidor / daemon agente.
- `GET /api/v1/nodes/:id/stats` - Métricas en tiempo real del nodo (CPU, RAM, disco y red).

### Plantillas (Templates & Eggs)
- `GET /api/v1/templates` - Lista de plantillas verificadas (Minecraft, Bots, Node, DBs).
- `POST /api/v1/templates` - Crear o importar plantilla comunitaria.
- `POST /api/v1/templates/seed-defaults` - Carga el catálogo base de plantillas de NexusPanel.

### Servicios & Workloads
- `GET /api/v1/services` - Lista de servicios de la organización activa.
- `GET /api/v1/services/:id` - Detalles completos del servicio (instancia, puertos, nodo, specs).
- `POST /api/v1/services` - Creación y orquestación automática en el nodo óptimo.
- `POST /api/v1/services/:id/actions` - Ejecución de acciones de energía (`START`, `STOP`, `RESTART`).
- `GET /api/v1/services/:id/files` - Listado jerárquico de archivos con SafeFS.
- `GET /api/v1/services/:id/files/content` - Lectura de archivo para edición en Monaco.
- `POST /api/v1/services/:id/files/content` - Escritura y guardado de archivo.
- `POST /api/v1/services/:id/files/delete` - Eliminación de archivos o directorios.

### WebSockets en Tiempo Real
- `GET /api/v1/services/:id/console` - Túnel bidireccional VT100 / xterm.js interactivo conectado al contenedor.
- `GET /api/v1/services/:id/stats` - Streaming de uso en vivo de CPU, RAM e I/O de red.
