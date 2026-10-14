# Plan Director y Arquitectura Base del SGA (Sistema de Gestión de Almacenes)

> **AVISO PARA AGENTES DE IA:** Este documento es la fuente de verdad arquitectónica del proyecto. Antes de ejecutar cambios en la base de datos, el backend o cualquiera de los frontends (Web/PDA), debes leer detenidamente las directrices aquí descritas para no romper los patrones de diseño establecidos.

---

## 1. INSTRUCCIONES PARA AGENTES DE DESARROLLO (IA)

Dependiendo de la faceta en la que el agente esté trabajando, debe adherirse estrictamente a las siguientes reglas:

### 1.1. Agente Especialista en Backend y Base de Datos (Python/Flask)
* **Patrón de Arquitectura:** El sistema utiliza un **Patrón Repositorio** estricto (`app/repositories/`). **Bajo ningún concepto** debes escribir consultas SQL en los Controladores (`routes`) o en la lógica de negocio (`services`).
* **Regla de Migración:** El proyecto se encuentra en transición de Oracle a PostgreSQL. Si modificas o creas una consulta SQL, asegúrate de que sea compatible con Postgres (usar `%s` para variables, `COALESCE` en lugar de `NVL`, y `CURRENT_TIMESTAMP` en lugar de `SYSDATE`).
* **Transacciones (ACID):** En procesos en cascada (como mover stock y crear trazas de movimientos), asegúrate siempre de usar un gestor de contexto que asegure el *commit* conjunto o el *rollback* total en caso de fallo (mantener consistencia en el almacén).

### 1.2. Agente Especialista en Frontend Operativo (PDA)
* **Contexto de Usuario:** La aplicación en la carpeta `/pda/` es utilizada por operarios de almacén con terminales móviles.
* **Directrices de UI/UX:**
  1. **Cero tecleo:** Prioriza inputs que se completen automáticamente escuchando eventos de lectores de código de barras.
  2. **Alto contraste y botones grandes:** El operario usa guantes y la iluminación del almacén varía.
  3. **Flujos cerrados (Wizard):** No crees menús de navegación complejos. El flujo debe ser secuencial: Escanear Ubicación -> Escanear Producto -> Confirmar Cantidad.
  4. **Validación Inmediata:** Ante un error (ej. escanear el código incorrecto), dispara alertas sonoras y fondos rojos inmediatamente.

### 1.3. Agente Especialista en Frontend Backoffice (Web)
* **Contexto de Usuario:** La aplicación en la carpeta `/frontend/` es utilizada por la administración (Jefes de Almacén).
* **Directrices:** Aquí sí se permiten tablas de datos complejas, filtros avanzados, drag-and-drop para agrupar "Olas" (Waves) de picking, y gráficos de ocupación/volumetría.

---

## 2. ESTRATEGIA DE BASE DE DATOS (Migración a PostgreSQL)

### 2.1. Justificación
Se abandona Oracle a favor de **PostgreSQL** para lograr independencia.
* **Gestión de Stock:** PostgreSQL garantiza las transacciones ACID necesarias para procesos en cascada en un SGA.
* **Rendimiento:** Soporta sin problemas los ~30GB estimados y la carga transaccional de ~50 operarios y demonios conectados simultáneamente usando bloqueos por fila (MVCC).

### 2.2. Hoja de Ruta de Migración
1. **Adaptador de Conexión:** En `app/database.py`, se debe crear una clase `PostgresDatabase` (usando `psycopg2`) que exponga los mismos métodos exactos que la actual `OracleDatabase` (`execute_query`, `execute_non_query`, `call_procedure`).
2. **Refactorización de Repositorios:** Modificar el Raw SQL dentro de los archivos `_repo.py` para adaptar el dialecto (Paginación con LIMIT/OFFSET en lugar de ROWNUM).
3. **Procedimientos Almacenados:** Traducir los scripts de PL/SQL (Oracle) a PL/pgSQL (PostgreSQL). Ambos lenguajes son casi idénticos, por lo que la curva de adaptación es mínima.

---

## 3. ARQUITECTURA CONCEPTUAL DEL FRONTEND

El sistema separa radicalmente las interfaces de usuario:
* **Módulo de Mapeo y Maestros (Web):** Definición de la estructura del almacén (`Zona -> Pasillo -> Hueco`) y propiedades logísticas (peso máximo, dimensiones).
* **Recepción de Proveedores / Inbound (PDA):** Flujos de validación de albaranes contra escaner de cajas físicas. El sistema (Backend) procesará las dimensiones y **sugerirá** el hueco óptimo (Putaway) en la PDA.
* **Preparación de Pedidos / Outbound (PDA):** Algoritmos de enrutamiento que evitan que el operario haga zig-zag. Validaciones por caja para no exceder los topes de volumen/peso logístico.
* **Inventario / Conteos (PDA):** Interfaces de "Conteo Ciego" (Blind Count). El sistema no le dice al operario qué cantidad hay en el hueco, obligándole a contar físicamente para evitar validaciones falsas.

---

## 4. ENTORNO DE DESARROLLO Y HERRAMIENTAS

Para los desarrolladores (humanos o IA) que modifiquen este Monorepo:
* **Editor Base:** Visual Studio Code (VS Code) con extensiones de Python, Docker y framework JS correspondiente.
* **Infraestructura Local:** Uso obligatorio de **Docker y Docker Compose** (`docker-compose.dev.yml`). Se debe añadir un servicio `postgres:15-alpine` al fichero para tener una BBDD efímera local.
* **Cliente de Base de Datos:** **DBeaver**. Crucial para la fase de migración porque permite abrir conexiones concurrentes a la BBDD Oracle antigua y la Postgres nueva en la misma pantalla.
* **Pruebas de API:** Bruno o Postman para simular transacciones de la PDA disparando endpoints JSON al backend.
