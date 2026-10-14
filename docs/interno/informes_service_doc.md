# Documentación: Informes Service

## 1. Documentación Técnica (Devs)

### Arquitectura y Diseño
El servicio `InformesService` maneja un sistema de almacenamiento de informes ligero, independiente de la base de datos Oracle principal. Utiliza almacenamiento basado en archivos JSON en el sistema de archivos del servidor.

- **Almacenamiento Local:** Los datos se persisten en `[BASE_DIR]/data/informes.json`.
- **Mecanismo de Auto-inicialización:** El método `_ensure_file_exists` verifica la existencia del directorio y archivo JSON antes de cualquier operación de lectura. Si no existe, lo inicializa con un array vacío `[]`.
- **Gestión de IDs:** En la creación de un nuevo informe (si no trae `id`), el servicio autogenera un identificador único basado en el timestamp actual en milisegundos.
- **Rendimiento:** Ideal para configuraciones que cambian poco y no requieren la complejidad transaccional de la base de datos principal.

### API Interna (Métodos Principales)
| Método | Descripción | Retorno |
|--------|-------------|---------|
| `get_informes()` | Obtiene la lista completa de informes del JSON. | `List[Dict]` |
| `save_informe(informe)` | Crea (asigna ID) o actualiza un informe existente en el JSON. | `Dict` (Informe guardado) |
| `delete_informe(id)` | Elimina el informe del JSON mediante su ID. | `bool` (Éxito) |

*\[Insertar diagrama de flujo de lectura/escritura del archivo JSON aquí\]*

---

## 2. Manual de Usuario (Operadores)

### Gestión de Informes Rápidos
Este módulo le permite guardar definiciones o plantillas de informes simples en el sistema.

**Crear o Editar un Informe:**
1. Navegue al panel de **Gestión de Informes**.
2. Para crear uno nuevo, complete el **Nombre**, la **Consulta (SQL)** y seleccione un **Filtro**.
3. Haga clic en **Guardar**. El sistema asignará un identificador automático si es nuevo.
4. Si edita uno existente, los cambios reemplazarán la versión anterior.

**Eliminar un Informe:**
1. En la lista de informes, busque el que desea borrar.
2. Pulse el botón **Eliminar**. Esta acción es inmediata y no se puede deshacer.

*\[Insertar captura de pantalla del formulario de creación de informes aquí\]*
