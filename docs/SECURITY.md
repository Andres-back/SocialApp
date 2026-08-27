# Seguridad y privacidad

Esta aplicación tratará información de menores. El MVP incorpora controles técnicos y separación por roles, pero **no autoriza un despliegue productivo** por sí solo.

## Controles incorporados

- Validación global y rechazo de propiedades desconocidas.
- Límite de tamaño JSON, CORS restringido, Helmet y rate limiting.
- Contraseñas con Argon2id.
- Tokens breves, refresh tokens rotatorios, almacenados como hash y revocables.
- Guards de permisos en API.
- UUID, borrado lógico y campos de auditoría.
- App shell sin respuestas privadas en Cache Storage.
- Cola local que no descarta información antes de confirmación.

## Antes de un piloto

- Usar HTTPS y secretos de un gestor, no archivos versionados.
- Aprobar matriz rol/permiso y alcance offline por el responsable de datos.
- Cifrar respaldos y datos locales sensibles con una clave protegida por el dispositivo.
- Definir bloqueo por inactividad y desbloqueo offline.
- Ejecutar análisis de amenazas, revisión de dependencias y pruebas de autorización.
- Documentar base legal, finalidad, consentimiento cuando aplique, retención, atención de derechos e incidentes conforme a la jurisdicción.
- Implementar gestión de dispositivos, revocación, limpieza local y procedimiento por pérdida.

## Regla de dominio obligatoria

Los datos informados, indicadores automáticos y valoraciones profesionales serán entidades/campos separados. Una regla nunca produce un diagnóstico clínico ni una conclusión profesional.
