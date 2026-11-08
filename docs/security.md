# NexusPanel - Modelo de Seguridad & Hardening Multi-Tenant

## 1. Principios de Defensa en Profundidad

La arquitectura de NexusPanel está diseñada bajo la premisa de **desconfianza cero (Zero Trust)** frente a cualquier workload ejecutado por usuarios:

1. **Aislamiento a nivel de Kernel y Contenedores:**
   - Todos los workloads corren con `no-new-privileges: true` activo, impidiendo elevación de privilegios mediante ejecutables SUID/SGID.
   - Perfil Seccomp por defecto restrictivo que bloquea llamadas al kernel peligrosas (`ptrace`, `sys_chroot`, `kexec_load`).
   - Límite estricto de descriptores de procesos (`pids-limit: 512` por defecto) para prevenir ataques de agotamiento por bifurcación (fork bombs).
   - Bloqueo de swap y cuotas duras de memoria RAM (OOM Killer confinado al contenedor, sin afectar al daemon del nodo ni al host).

2. **Seguridad del Sistema de Archivos (SafeFS):**
   - El daemon del agente valida de manera canónica (`filepath.Clean` y `filepath.Rel`) que ninguna ruta solicitada por el usuario pueda escapar del directorio raíz del volumen `/var/lib/nexuspanel/volumes/<serviceId>`.
   - Se mitigan ataques de enlaces simbólicos (Symlink attacks) que intenten apuntar a `/etc/passwd`, `/var/run/docker.sock` o archivos del sistema host.

3. **Cifrado de Secretos y Variables de Entorno:**
   - Las contraseñas y tokens sensibles de los servicios se cifran en reposo con **AES-256-GCM** utilizando una clave maestra derivada mediante PBKDF2/KMS.
   - Los hashes de contraseñas de usuarios utilizan `bcrypt` con costo 12.
   - Las sesiones WebSocket de consola requieren token con expiración y validación de origen.

4. **Aislamiento de Red:**
   - Red privada bridge interna por organización o proyecto (`isIsolated: true`).
   - Los contenedores entre organizaciones distintas no pueden comunicarse mediante DNS interno de Docker ni resolver IPs privadas de otros tenants.
   - Mapeo explícito de puertos TCP/UDP solo para los servicios que lo requieran (servidores de juego o proxies web).
