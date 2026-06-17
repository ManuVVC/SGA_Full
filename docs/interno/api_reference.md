# Documentación de la API para el Frontend (SGA)

Este documento detalla la información necesaria para que el equipo de Frontend pueda consumir los servicios RESTful expuestos por el backend del Sistema de Gestión de Almacenes (SGA).

## URL Base

Todas las rutas mencionadas en este documento son relativas a la URL base del backend.
Ejemplo: `http://localhost:5000/api`

---

## 1. Módulo de Autenticación y Terminales

El proceso de inicio de sesión valida tanto las credenciales del operario como el terminal (dirección IP) desde donde se realiza la conexión.

### GET `/auth/terminal`

Obtiene la información del terminal basada en la dirección IP fija desde la que se realiza la petición. Debe llamarse al cargar la aplicación para pintar los datos en la pantalla de login.

> **Importante sobre la lectura de IP:** 
> Debido a que el frontend puede pasar por proxies (el entorno de desarrollo Vite o servidores como Nginx/Load Balancers en producción), **el backend debe leer la IP priorizando la cabecera `X-Forwarded-For`**. Si dicha cabecera no existe, debe recurrir a la IP del socket tcp.

**Respuestas:**

* **200 OK (Terminal Reconocido)**
```json
{
  "status": "success",
  "terminal": {
    "CODTERMINAL": "TERM01",
    "DESCRIPCION": "Terminal Planta 1",
    "CODOPERADOR": null,
    "NOMBREOPERADOR": null,
    "PRM_BLOQUEADO": 0
  }
}
```
* **403 Forbidden (Terminal Bloqueado o IP No Autorizada)**
```json
{
  "status": "error",
  "error": "Forbidden",
  "message": "Terminal no autorizado o IP desconocida"
}
```

### POST `/auth/login`

Autentica a un usuario. El backend ya reconoce el terminal por la IP fija de origen.

**Cabeceras (Headers):**
- `Content-Type: application/json`

**Cuerpo de la Petición (JSON):**
```json
{
  "username": "CÓDIGO_OPERADOR",
  "password": "CONTRASEÑA"
}
```
*(Nota: Si la base de datos permite contraseña en nulo para el operador, se puede omitir o mandar vacío según configuración)*

**Respuestas:**

* **200 OK (Éxito)**
```json
{
  "status": "success",
  "message": "Autenticación exitosa",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
  "permisos": {
    "PRM_LECTURA": true,
    "PRM_ESCRITURA": false
  },
  "terminal": {
    "CODTERMINAL": "TERM01",
    "DESCRIPCION": "Terminal Planta 1",
    "CODOPERADOR": null,
    "NOMBREOPERADOR": null,
    "PRM_BLOQUEADO": 0
  }
}
```
* **401 Unauthorized (Credenciales Inválidas)**
```json
{
  "status": "error",
  "error": "Unauthorized",
  "message": "La contraseña proporcionada es incorrecta."
}
```
* **403 Forbidden (Terminal Bloqueado o IP No Autorizada)**
```json
{
  "status": "error",
  "error": "Forbidden",
  "message": "Terminal no autorizado" // o "El terminal se encuentra bloqueado"
}
```
* **404 Not Found (Usuario No Existe)**
```json
{
  "status": "error",
  "error": "Not Found",
  "message": "El operador 'USER' no existe en el sistema."
}
```

---

## 2. Módulo de Inventario y Stock

Requiere que el usuario esté autenticado. Todas las peticiones deben incluir el token JWT obtenido en el login.

### GET `/stock/<codigo_articulo>`

Consulta el stock actual de un artículo y detalla sus ubicaciones.

**Cabeceras (Headers):**
- `Content-Type: application/json`
- `Authorization: Bearer <TU_TOKEN_JWT>`

**Parámetros de Ruta:**
- `codigo_articulo` (String): Código alfanumérico o ID interno del artículo a buscar.

**Respuestas:**

* **200 OK (Con Stock Disponible)**
```json
{
  "articulo": {
    "cod_articulo": 1054,
    "codigo_aplicacion": "ART-001",
    "descripcion": "Caja de Cartón"
  },
  "tiene_stock": true,
  "total_stock": 150.0,
  "ubicaciones": [
    {
      "cod_ubicacion": 50,
      "etiqueta": "ESTANTE-A1",
      "lote": "LOTE-2023",
      "cantidad": 100.0,
      "fecha_caducidad": "2024-12-31T00:00:00"
    },
    {
      "cod_ubicacion": 55,
      "etiqueta": "ESTANTE-B2",
      "lote": "LOTE-2023",
      "cantidad": 50.0,
      "fecha_caducidad": "2024-12-31T00:00:00"
    }
  ]
}
```

* **200 OK (Sin Stock en ubicaciones)**
```json
{
  "articulo": {
    "cod_articulo": 1054,
    "codigo_aplicacion": "ART-001",
    "descripcion": "Caja de Cartón"
  },
  "tiene_stock": false,
  "total_stock": 0,
  "ubicaciones": []
}
```

* **401 Unauthorized (Sin Token o Token Inválido)**
```json
{
  "message": "Token de autenticación faltante o inválido."
}
```

* **404 Not Found (Artículo Inexistente)**
```json
{
  "status": "error",
  "error": "Not Found",
  "message": "El artículo no existe o no tiene stock registrado"
}
```

---

## Consideraciones Generales para el Frontend

1. **Persistencia del Token**: Se recomienda almacenar el `token` devuelto por `/auth/login` de forma segura (ej. `sessionStorage` o `localStorage`) y adjuntarlo en la cabecera `Authorization: Bearer <token>` para todas las futuras peticiones a rutas protegidas.
2. **Validación de Terminal**: Si durante el login el backend responde con un HTTP 403, el frontend debe mostrar un mensaje claro indicando al operario que el dispositivo desde el cual se está conectando no está autorizado o se encuentra bloqueado por la administración.
3. **Manejo de Errores Genéricos**: Preparar la aplicación para manejar códigos `500 Internal Server Error` mostrando un aviso amigable ("Ocurrió un error en el servidor, contacte al administrador") en caso de que la base de datos se desconecte o haya fallos internos.
