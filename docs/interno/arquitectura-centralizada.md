# Arquitectura y Refactorización Centralizada (SGA Monorepo)

Este documento describe las directrices y los patrones de arquitectura centralizada adoptados en el sistema SGA tanto para el **Backend (Python/Flask)** como para el **Frontend (React/Vite PDA)**. El objetivo principal es eliminar la redundancia de código, prevenir filtraciones de conexiones o recursos y estandarizar la experiencia de usuario y de desarrollo en toda la plataforma.

---

## 1. Centralización de Base de Datos en Backend

### Patrón Anterior (Desaconsejado)
Anteriormente, cada método en los módulos de repositorio (`*_repo.py`) gestionaba de forma manual la conexión a la base de datos invocando `cx_Oracle.connect(...)`, `cursor.close()` y `conn.close()`. Esto generaba riesgos de fugas de conexiones en caso de excepciones intermedias y duplicidad masiva de código de gestión de transacciones.

### Nuevo Patrón Centralizado: Gestor de Contexto (`OracleDatabase`)
Toda interacción con Oracle debe realizarse a través del módulo centralizado `backend/app/database.py`, utilizando la clase `OracleDatabase` con su gestor de contexto (`with ... as cursor:`):

```python
from app.database import OracleDatabase

def obtener_datos_ejemplo(parametro):
    with OracleDatabase.get_cursor() as cursor:
        cursor.execute("SELECT * FROM TABLA WHERE CAMPO = :1", [parametro])
        rows = cursor.fetchall()
        # Mapeo de columnas a diccionario...
        return resultados
```

#### Ventajas del Gestor de Contexto:
* **Adquisición y liberación segura**: La conexión y el cursor se cierran automáticamente al salir del bloque `with`, incluso si se produce una excepción incontrolada.
* **Manejo uniforme de transacciones**: Los comandos DML (`INSERT`, `UPDATE`, `DELETE`) realizan un `commit()` implícito al finalizar exitosamente el bloque, o un `rollback()` si ocurre un error.
* **Reducción de huella en repositorios**: Repositorios como `pedidos_repo.py`, `preparacion_repo.py`, `entradas_repo.py`, `stock_repo.py` y `ajustes_stock_repo.py` son ahora completamente limpios y enfocados únicamente en lógica SQL.

---

## 2. Centralización de Servicios API en Frontend

### Patrón Anterior (Desaconsejado)
Los módulos de servicio en `pda/src/api/*Service.js` envolvían cada llamada a Axios en bloques `try/catch` repetitivos, capturando errores para lanzarlos o loguearlos, y extrayendo manualmente `response.data`.

### Nuevo Patrón Centralizado: Wrappers `fetchData` y `mutateData`
En `pda/src/api/apiService.js` (instancia de Axios equipada con `axios-retry` para zonas de sombra Wi-Fi e interceptores de JWT/Terminal), se han introducido dos funciones wrapper exportadas:

* `fetchData(url, config)`: Estandariza peticiones de lectura (`GET`).
* `mutateData(method, url, data, config)`: Estandariza peticiones de modificación (`POST`, `PUT`, `DELETE`).

#### Ejemplo de uso en un servicio (`*Service.js`):
```javascript
import { fetchData, mutateData } from './apiService';

// Petición GET
export const getPedidosPendientes = () => {
  return fetchData('/entradas/pedidos-pendientes');
};

// Petición POST
export const grabarLineaEntrada = (payload) => {
  return mutateData('post', '/entradas/grabar-linea', payload);
};
```

---

## 3. Centralización de Componentes de UI (React PDA)

Para evitar que las diferentes vistas (como `PreparaPedido.jsx` o `EntradaMercancia.jsx`) implementen modales y barras inferiores con estilos Tailwind ad-hoc (`fixed inset-0 z-50 bg-black/60...`), se ha creado una librería de componentes reusables en `pda/src/components/`:

### A. Componente `Modal` (`pda/src/components/Modal.jsx`)
Soporta tanto diálogos emergentes centrados como modales de pantalla completa para listados largos.
* **Propiedades clave**: `isOpen`, `onClose`, `title`, `icon`, `headerClassName`, `maxWidth`, `fullHeight`.

### B. Componente `ConfirmDialog` (`pda/src/components/ConfirmDialog.jsx`)
Construido sobre `Modal`, estandariza las alertas de confirmación de acciones críticas o confirmaciones de salida.
* **Propiedades clave**: `isOpen`, `onCancel`, `onConfirm`, `title`, `message`, `confirmText`, `cancelText`.

### C. Componente `WizardBottomBar` (`pda/src/components/WizardBottomBar.jsx`)
Estandariza las barras de navegación inferiores de los flujos paso a paso en las pantallas PDA (botones de Anterior, Siguiente, Ver Líneas, etc.).
* **Propiedades clave**: `items` (Array de objetos con `label`, `icon`, `onClick`, `disabled`, `variant`), `columns`.

---

## 4. Reglas Generales de Mantenimiento

1. **No alterar el esquema SQL ni consultas existentes** sin validación expresa del usuario.
2. **Respetar el flujo multi-entorno** documentado en `multi-entorno.md` al desplegar en desarrollo o producción.
3. **Mantener la documentación interna**: Cualquier nuevo componente común, repositorio o servicio estandarizado debe agregarse a esta carpeta de documentación (`docs/interno/`).
