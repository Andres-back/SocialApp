# Estrategia inicial de respaldo

Propuesta para el entorno productivo (debe adaptarse al proveedor y política institucional):

- Respaldo PostgreSQL diario cifrado y recuperación a un punto en el tiempo cada 15 minutos.
- Retención: 35 días diarios, 12 cierres mensuales y 5 cierres anuales, sujeta a la política jurídica de conservación.
- Copia en una cuenta/región separada con acceso mínimo y registros inmutables.
- Prueba automática de integridad diaria.
- Restauración ensayada trimestralmente en un entorno aislado y documentada con RPO/RTO observado.
- Al menos dos responsables autorizados para aprobar una restauración productiva.

IndexedDB no es un respaldo. Los registros locales pendientes deben sincronizarse; la interfaz advierte mientras exista trabajo no confirmado por el servidor.

