# Seguridad de Contraseñas en SGA Backend

## Modificación de Validación de Contraseñas
Se ha modificado el servicio de autenticación en `app/services/auth_service.py` para evitar el uso de contraseñas planas. A partir de ahora, el sistema utiliza `check_password_hash` de la librería `werkzeug.security` para validar contraseñas de forma segura.

### Retrocompatibilidad
Para asegurar que los usuarios existentes puedan seguir iniciando sesión antes de que sus contraseñas sean migradas, se ha mantenido un mecanismo de retrocompatibilidad. Si la contraseña guardada en la base de datos comienza por el prefijo `pbkdf2:` (indicador de un hash de werkzeug), se asume que la contraseña está cifrada. Si no tiene ese prefijo, el sistema asumirá que es una contraseña plana y la evaluará como texto plano temporalmente, forzando posteriormente su actualización en bloque.

## Script de Migración
Se ha creado un script en `scripts/migrar_passwords.py` que:
1. Conecta con la base de datos Oracle reutilizando la configuración existente en `database.py`.
2. Lee todos los operadores de la tabla `TMST_OPERADORES` que tengan contraseñas guardadas sin el formato hash (`pbkdf2:`).
3. Genera un hash seguro utilizando `generate_password_hash`.
4. Actualiza la fila correspondiente en la base de datos con la nueva contraseña cifrada.

### Ejecución del script
Para ejecutar la migración de contraseñas, situarse en el directorio del backend y ejecutar:
```bash
python scripts/migrar_passwords.py
```
Este proceso transformará de una vez todas las contraseñas planas en hashes seguros.
