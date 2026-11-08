# NexusPanel - Plan de Pruebas & Calidad (QA)

Este documento detalla la estrategia de pruebas unitarias, de integración, de seguridad (pentesting básico) y de carga para NexusPanel.

---

## 1. Pruebas Unitarias & Integración (API & Agente)

### A. Pruebas del Agente en Go (`apps/agent`)
Se valida que el motor de `SafeFS` evite de forma estricta cualquier intento de Directory Traversal:

```bash
cd apps/agent
go test -v ./internal/filesystem/...
```

Casos cubiertos:
1. `TestSanitizePath_Normal`: Rutas válidas dentro del volumen (`config/server.properties`).
2. `TestSanitizePath_Traversal`: Detección y bloqueo de rutas como `../../../../etc/shadow` devolviendo error `path traversal detected`.
3. `TestSanitizePath_Symlink`: Prevención de enlaces simbólicos creados dentro del contenedor que apunten a rutas fuera de `/var/lib/nexuspanel/volumes/<id>`.

---

## 2. Pruebas de Carga y Resiliencia

### A. Simulación de Caída del Panel (Control Plane Independence)
1. Iniciar un servidor de Minecraft Paper y una base de datos PostgreSQL mediante el panel.
2. Detener el contenedor de la API:
   ```bash
   docker stop nexus-api
   ```
3. Verificar con el cliente de Minecraft (`nc -zv localhost 25565`) y con `psql` que los workloads siguen activos y recibiendo tráfico.
4. Reiniciar la API y confirmar que reconecta el estado con el agente automáticamente.

### B. Pruebas de Concurrencia de WebSocket (Terminal xterm.js)
- Herramienta: `k6` o `autocannon`.
- Simulación: 500 conexiones WebSocket concurrentes transmitiendo 100 comandos por segundo a la consola.
- Criterio de éxito: Cero caídas del proceso Fastify, uso de memoria estable sin fugas (Memory leaks) y latencia p99 < 15ms.

---

## 3. Matriz de Comprobación Pre-Lanzamiento (Checklist)

| Categoría | Verificación | Estado |
| :--- | :--- | :--- |
| **Seguridad** | `no-new-privileges` habilitado en Docker | ✅ Validado |
| **Seguridad** | Contraseñas cifradas con `bcrypt` costo 12 | ✅ Validado |
| **Seguridad** | 2FA con TOTP RFC 6238 funcional | ✅ Validado |
| **Resiliencia** | Límite estricto de memoria y CPU cgroups v2 | ✅ Validado |
| **Aislamiento** | Prevención de Path Traversal en `SafeFS` | ✅ Validado |
| **Orquestación** | Prevención de colisión de puertos en nodos | ✅ Validado |
| **UX** | Consola con colores ANSI y emulación xterm | ✅ Validado |
| **UX** | Editor Monaco con soporte JSON, YAML, Properties | ✅ Validado |
