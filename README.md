# SocialApp

PWA offline-first para organizar el trabajo de profesionales de Trabajo Social con niños, niñas y adolescentes vinculados a programas deportivos.

> Estado: **MVP funcional completo**. Incluye población, expediente y ficha social, caracterización socioeconómica, alertas, seguimientos, observaciones, familiograma, ecomapa, brigadas/tamizajes, reportes, administración, auditoría y sincronización offline.

## Requisitos

- Node.js 20.19 o superior.
- npm 10 o superior.
- Docker Desktop, o una instancia PostgreSQL 16 accesible.

## Puesta en marcha

```bash
npm install
copy .env.example apps\api\.env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

En macOS/Linux use `cp .env.example apps/api/.env`. Abra `http://localhost:5173`.

## Ejecución completa con Docker

```bash
docker compose up -d --build
docker compose exec api npm run prisma:seed -w @socialapp/api
```

Abra `http://localhost:8081`. Nginx sirve la PWA y comunica internamente con la API. PostgreSQL se publica en `127.0.0.1:5440` solo para facilitar tareas de desarrollo. Los puertos, el origen web, la contraseña de PostgreSQL y el uso de cookies seguras pueden configurarse desde `.env`.

Para detener los servicios sin borrar los datos:

```bash
docker compose stop
```

No ejecute `docker compose down -v` salvo que quiera eliminar definitivamente la base de desarrollo.

Usuarios ficticios de desarrollo (todos usan `SocialApp2026!`):

- Trabajo Social: `trabajo.social@demo.local`
- Administración: `admin@demo.local`
- Coordinación: `coordinacion@demo.local`
- Entrenador: `entrenador@demo.local`

No use estas credenciales ni los secretos de `.env.example` en producción.

## Comandos

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Ejecuta web y API en modo desarrollo |
| `npm run build` | Compila todos los espacios de trabajo |
| `npm test` | Ejecuta pruebas unitarias |
| `npm run typecheck` | Comprueba TypeScript estricto |
| `npm run db:migrate` | Crea/aplica una migración Prisma de desarrollo |
| `npm run db:seed` | Carga roles, permisos y usuarios ficticios |

## Organización

- `apps/web`: React, Vite, Tailwind, PWA, Dexie e interfaz responsive.
- `apps/api`: NestJS, Prisma, PostgreSQL, JWT, roles/permisos y auditoría.
- `packages/shared`: contratos y tipos compartidos sin dependencias del navegador o servidor.
- `docs`: arquitectura, decisiones, seguridad y operación.

## Módulos funcionales

1. Registro, edición, búsqueda y filtros de deportistas, acudientes y contexto deportivo/escolar.
2. Ficha social con composición familiar, cuidadores, relaciones y redes de apoyo.
3. Caracterización socioeconómica de vivienda, servicios, transporte, alimentación e ingresos.
4. Alertas automáticas revisables, valoración profesional y trazabilidad separada del dato informado.
5. Casos de seguimiento, intervenciones, acuerdos, responsables, agenda y estados.
6. Observaciones profesionales con visibilidad, línea de tiempo, familiograma y ecomapa editables.
7. Instrumentos versionados y brigadas planeadas, activas o finalizadas, con filtros de población, asignación de deportistas, avance por participante, tamizajes reanudables y resultados imprimibles.
8. Tablero, reportes agregados, reporte individual, exportación CSV compatible con Excel e impresión/PDF auditada.
9. Administración de usuarios, estados, roles, catálogos, instrumentos, reglas y consulta de auditoría.
10. PWA instalable, borradores locales, cola idempotente, conflictos optimistas y sincronización al reconectar.

Los datos informados y la observación profesional se presentan en campos separados. La ficha no genera diagnósticos.

## PWA y trabajo sin conexión

La compilación de producción registra un Service Worker que guarda el *app shell*. Dexie persiste borradores y una cola de mutaciones en IndexedDB. La cola nunca elimina una mutación hasta que el servidor confirma su recepción. En desarrollo, el Service Worker está habilitado para poder verificar este flujo.

Para probarlo: ejecute `npm run build -w @socialapp/web` y `npm run preview -w @socialapp/web`, abra la aplicación una vez, active el modo sin conexión en las herramientas del navegador y recargue.

En las brigadas, cada respuesta se conserva localmente como avance y se sincroniza al recuperar la conexión. Una jornada solo puede cerrarse cuando todos sus participantes tienen el tamizaje completo; los resultados cerrados quedan disponibles en modo de consulta e impresión.

## Migraciones

El esquema vive en `apps/api/prisma/schema.prisma`. Durante desarrollo:

```bash
npm run db:migrate -- --name nombre_descriptivo
```

En despliegue se usará `prisma migrate deploy`, nunca `db push`.

## Seguridad y datos

- El token de acceso es breve; la renovación usa cookie `HttpOnly`.
- Los refresh tokens se almacenan como hash y pueden revocarse.
- La autorización se comprueba en la API, no solo en el menú.
- La semilla y las pruebas usan únicamente datos ficticios.
- HTTPS, secretos gestionados, respaldo, cifrado local endurecido y políticas institucionales son requisitos previos a producción.
- El borrado funcional será lógico mediante `deletedAt`.

Consulte [Arquitectura](docs/ARCHITECTURE.md), [Seguridad](docs/SECURITY.md) y [Respaldo](docs/BACKUP.md).
