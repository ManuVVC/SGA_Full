# Base de Datos y Pruebas del Sistema

## 🗄️ Base de Datos (Oracle)

El backend de SGA se conecta a una base de datos Oracle centralizada. 

### Uso de Bind Variables
Por motivos de rendimiento y para prevenir Inyecciones SQL, **TODAS** las consultas de la aplicación deben utilizar "Bind Variables" nombradas.
```python
# ❌ INCORRECTO: Concatenación (Peligro de SQL Injection)
cursor.execute(f"SELECT * FROM TMST_OPERADORES WHERE CODOPERADOR = '{user}'")

# ✅ CORRECTO: Bind Variables Oracle (:nombre)
cursor.execute("SELECT * FROM TMST_OPERADORES WHERE CODOPERADOR = :user", {"user": user})
```

### Pool de Conexiones
El sistema inicia automáticamente un `oracledb.create_pool` a nivel de servidor (`database.py`). Esto significa que las conexiones se reutilizan. Es **crítico** devolver la conexión al pool. Para garantizarlo, se utiliza el *Context Manager*: `with db.get_cursor() as cursor:`.

### Nomenclatura Común
- **`TMST_OPERADORES`**: Tabla de usuarios/operadores logísticos del almacén. Contiene contraseñas y permisos.
- **`SPTOL_*` / `SPPRP_*`**: Nomenclatura heredada (legacy) que denota procedimientos almacenados o consultas vinculadas a operaciones logísticas antiguas de tolerancia y preparación. 


## 🧪 Pruebas Unitarias y de Integración

Debido a que el negocio (`services/`) ha sido totalmente desacoplado del enrutador de Flask (`routes/`), probar el backend es un proceso limpio y puramente lógico.

### Backend (pytest)
- Para probar un servicio, instancia la clase de servicio inyectándole un repositorio *Mock* (o simulado). 
- Al no depender de `flask.request`, puedes pasar strings planos con IPs o credenciales ficticias.
- Al testear repositorios de base de datos reales (`Integration Tests`), recuerda iniciar la prueba con una limpieza temporal y ejecutar el *Context Manager* con un `rollback` final para no alterar los datos locales.

### Frontend y PDA (Vitest / Testing Library)
- Al testear componentes de la PDA, ten en cuenta el componente del teclado y escaner virtual. Simula eventos de presión de teclas globales para probar flujos `useScannerFocus`.
- Siempre intercepta/mockea `adminApi` o `apiService` para probar los diferentes estados (`loading`, `error`, `success`) de la UI sin necesidad del servidor en vivo.
