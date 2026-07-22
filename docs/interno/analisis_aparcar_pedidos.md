# Análisis: Aparcar y Recuperar Pedidos en Preparación

## Objetivo
Implementar la funcionalidad que permite a un operario "aparcar" (pausar) la preparación de un pedido (documento) y posteriormente "desaparcar" (recuperar) dicho documento para continuar con su preparación.

## 1. Permisos del Operario
Tras analizar la base de datos (tabla TMST_OPERADORES), se han identificado los siguientes permisos relevantes que controlan esta funcionalidad:

*   **PRM_APARCARDOCUMENTO**: Otorga al operario la capacidad de aparcar un documento que está actualmente en preparación.
*   **PRM_RECUPERARDOCUMENTOAPARCADO**: Otorga al operario la capacidad de recuperar (desaparcar) un documento que había sido aparcado previamente.
*   **PRM_RECUPERARDOCOTROTERMINAL**: Permite al operario recuperar un documento que fue aparcado usando un terminal distinto al actual.
*   **PRM_RECUPERARDOCOTROOPERARIO**: Permite al operario recuperar un documento que fue aparcado por un operario diferente.

## 2. Procedimientos Almacenados (Base de Datos)
La lógica principal de aparcar y recuperar se gestiona a través de los siguientes procedimientos en la base de datos (Presumiblemente en el paquete GSM_DOCUMENTOS, aunque se pueden invocar directamente si son sinónimos globales o prefijados correctamente):

### SPPRP_APARCARPREPARACIONDOC
Este procedimiento se encarga de cambiar el estado del documento a "aparcado", liberando bloqueos temporales si los hubiera.
*   **Tipo**: Función (devuelve NUMBER como código de estado/error).
*   **Argumentos IN**:
    *   P_CODDOCUMENTO (NUMBER): El identificador único del documento/pedido.
    *   P_CODOPERADOR (NUMBER): El identificador del operario que está realizando la acción.

### SPPRP_RECUPERARADOCAPARCADO
Este procedimiento reasigna el documento al terminal actual y lo devuelve a estado de preparación.
*   **Tipo**: Función (devuelve NUMBER como código de estado/error).
*   **Argumentos IN**:
    *   P_CODDOCUMENTO (NUMBER): El identificador único del documento aparcado.
    *   P_CODTERMINAL (NUMBER): El identificador del terminal desde el cual se está recuperando el documento. *(Nota: al recuperar, la DB reasigna el terminal de trabajo, pero el backend también debería tener en cuenta validaciones cruzadas de operario dependiendo de la lógica interna del SP).*

## 3. Propuesta de Implementación

### Backend (Python/Flask)
1.  **Nuevo Módulo**: Crear pedidos_routes.py, pedidos_service.py y pedidos_repo.py (si no existen) para manejar las operaciones de preparación.
2.  **Validación de Permisos**: Al autenticar/cargar el perfil del operario, se deben enviar los permisos (PRM_APARCARDOCUMENTO, etc.) en la respuesta del Login o consultarlos en tiempo real antes de ejecutar la acción.
3.  **Endpoints**:
    *   POST /api/pedidos/aparcar: Recibe cod_documento. El cod_operador se extrae del token JWT actual. Se verifica PRM_APARCARDOCUMENTO. Llama a SPPRP_APARCARPREPARACIONDOC.
    *   POST /api/pedidos/recuperar: Recibe cod_documento. El cod_terminal y cod_operador se extraen del contexto del usuario/token. Se validan los permisos (PRM_RECUPERARDOCUMENTOAPARCADO y opcionalmente los permisos de otro terminal/operador si corresponde). Llama a SPPRP_RECUPERARADOCAPARCADO.

### Frontend (PDA - React)
1.  **Botón "Aparcar"**: Añadir un botón en la pantalla de preparación de pedidos, visible solo si permisos.PRM_APARCARDOCUMENTO === 'S'.
2.  **Lista de Aparcados**: Proveer una vista (ej. "Pedidos Aparcados") donde el operario pueda ver los documentos pausados. Al seleccionar uno, si permisos.PRM_RECUPERARDOCUMENTOAPARCADO === 'S', se habilita la opción de recuperarlo.
3.  **Gestión de Errores**: Manejar las restricciones en UI si el operario intenta recuperar un pedido ajeno sin el permiso PRM_RECUPERARDOCOTROOPERARIO.
