# Arquitectura del MVP

## Resultado actual

Monorepo TypeScript modular con una PWA responsive, API REST, PostgreSQL, autenticación, autorización, auditoría y módulos de dominio completos para la operación inicial de Trabajo Social deportivo.

## Vista general

```text
PWA React
  ├─ UI y control de acceso visible
  ├─ IndexedDB (borradores, catálogo autorizado y SyncQueue)
  └─ Service Worker (app shell y lecturas no sensibles)
          │ HTTPS / JSON
          ▼
API NestJS /api/v1
  ├─ Autenticación JWT + refresh token rotatorio
  ├─ Guards de permisos
  ├─ Servicios de dominio
  ├─ Auditoría
  └─ Endpoint de sincronización idempotente
          │ Prisma
          ▼
PostgreSQL
```

El servidor es la fuente central de verdad. IndexedDB es una réplica selectiva y una bandeja de salida, no una segunda base institucional completa.

## Árbol del proyecto

```text
socialapp/
├─ apps/
│  ├─ web/
│  │  ├─ public/
│  │  └─ src/
│  │     ├─ app/             # composición, rutas y proveedores
│  │     ├─ components/      # layout y UI compartida
│  │     ├─ features/        # módulos por capacidad
│  │     ├─ lib/             # API, IndexedDB y sincronización
│  │     └─ pages/           # pantallas de ruta
│  └─ api/
│     ├─ prisma/             # esquema, migraciones y semilla
│     └─ src/
│        ├─ auth/
│        ├─ iam/             # roles/permisos
│        ├─ audit/
│        ├─ health/
│        ├─ prisma/
│        └─ sync/
├─ packages/shared/          # contratos y vocabulario común
├─ docs/
├─ docker-compose.yml
└─ package.json
```

## Módulos entregados

| Módulo | Responsabilidad |
| --- | --- |
| Identidad y acceso | Usuarios, roles, permisos, sesión y alcance de datos |
| PWA y almacenamiento local | Instalación, app shell, borradores y cola local |
| Sincronización | Envío idempotente, estados, reintentos y conflictos |
| Auditoría | Registro y consulta de accesos, cambios y exportaciones |
| Deportistas | Registro, búsqueda, filtros y expediente único |
| Ficha social | Composición, dinámica, cuidadores y redes de apoyo |
| Caracterización | Vivienda, transporte, alimentación e ingresos |
| Instrumentos y brigadas | Versiones, preguntas, jornadas, población y respuestas |
| Reglas y alertas | Indicadores automáticos separados de datos y valoraciones |
| Seguimientos | Casos, intervenciones, acuerdos, agenda y estados |
| Familiograma/ecomapa | Grafos editables persistidos como datos |
| Indicadores/reportes | Agregaciones, filtros y exportaciones auditadas |

## Estrategia offline-first

1. El Service Worker conserva solo los archivos necesarios para abrir la aplicación.
2. Al iniciar sesión y sincronizar, la API entrega únicamente información asignada y autorizada para ese dispositivo/usuario.
3. Las escrituras se guardan primero en una transacción local junto con una mutación de `SyncQueue`.
4. La interfaz responde de inmediato y muestra “Guardado en este dispositivo”.
5. El autoguardado usa borradores separados; cerrar la aplicación no pierde el avance.
6. Al recuperar conexión, el motor procesa la cola en orden, con reintentos acotados.
7. La réplica local queda vinculada a un único usuario; otro perfil no puede abrirla hasta aplicar la política institucional de purga o reasignación del dispositivo.

No se guardan respuestas sensibles en Cache Storage. Las respuestas API autenticadas se excluyen del caché del Service Worker.

## Estrategia de sincronización

Cada mutación lleva `mutationId` UUID, entidad, id de registro, operación, versión base, marca de tiempo y carga útil. El servidor guarda `mutationId` con restricción única: si el dispositivo reintenta, recibe el resultado anterior sin duplicar la operación.

Flujo de subida:

1. Detectar `online`.
2. Marcar un lote `processing` sin borrarlo.
3. Enviar lote con credenciales.
4. Aplicar cada resultado: `synced`, `retry` o `conflict`.
5. Conservar errores/conflictos para revisión.
6. Descargar cambios posteriores al último cursor confirmado.
7. Confirmar el estado local solo tras una transacción exitosa.

Conflictos: los registros sensibles usan versión optimista. Si `baseVersion` difiere de la versión central, la API rechaza la sobrescritura y conserva la mutación para revisión.

## Autenticación y roles

- Contraseñas: hash Argon2id.
- Access token JWT breve, mantenido en memoria/sesión del navegador.
- Refresh token aleatorio/JWT en cookie `HttpOnly`, `Secure` en producción y `SameSite=Lax`; su hash se persiste para rotación y revocación.
- La API aplica permisos granulares (`athlete:read`, `social-record:write`, etc.). Los roles solo agrupan permisos.
- El frontend oculta acciones no permitidas, pero no constituye una barrera de seguridad.
- Auditoría para login, logout, lectura sensible, cambios y exportaciones.

Roles iniciales: Trabajadora Social, Entrenador, Coordinador y Administrador. El rol del entrenador no recibe permisos de lectura sobre datos socioeconómicos ni observaciones reservadas.

## Decisiones técnicas

- **IndexedDB/Dexie**: almacena datos estructurados y permite transacciones offline.
- **Patrón outbox local**: evita perder cambios y permite reintentos seguros.
- **Prisma/PostgreSQL**: migraciones revisables, relaciones fuertes y transacciones.
- **NestJS modular**: guards, validación y módulos de dominio consistentes.
- **Contratos compartidos pequeños**: evitan acoplar la PWA al ORM.
- **UUID**: no expone secuencias institucionales y se puede generar offline.

## Riesgos técnicos prioritarios

| Riesgo | Mitigación |
| --- | --- |
| Exposición de datos locales si se pierde el dispositivo | réplica mínima, bloqueo offline, cifrado de campos y borrado remoto/política institucional antes de producción |
| Falsa detección de internet | comprobar salud real de API; `navigator.onLine` solo activa el intento |
| Duplicados por reintentos | `mutationId` único e idempotencia en servidor |
| Conflictos sobre información sensible | control de versión y resolución manual, nunca último escritor automático |
| Service Worker desactualizado | actualización controlada y aviso; no activar una versión incompatible durante un formulario |
| Revocación mientras el dispositivo está offline | sesiones offline cortas, alcance mínimo y validación obligatoria al reconectar |
| iOS elimina almacenamiento bajo presión | señal visible de estado, sincronización frecuente y advertencia operativa |
| Dependencia de políticas jurídicas/institucionales | evaluación de impacto, consentimiento/base legal, retención y perfiles aprobados antes del piloto |

## Límites conscientes antes de producción

El MVP no sustituye una historia clínica ni produce diagnósticos. El cifrado local fuerte, la gestión remota de dispositivos, la política de retención, el desbloqueo offline y la recuperación requieren decisiones institucionales antes de un piloto con datos reales. El despliegue productivo debe usar HTTPS, secretos gestionados, respaldos cifrados, monitoreo y una evaluación formal de privacidad.
