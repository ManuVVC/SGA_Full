# Documentación de Servicio: Pedidos (`pedidos_service.py`)

## Parte 1: Documentación Técnica (Para Desarrolladores)

### Visión General
El servicio `PedidosService` actúa como la capa de lógica de negocio para la gestión de documentos (pedidos) en el Sistema de Gestión de Almacén (SGA). Interconecta los controladores o endpoints de la API con la capa de persistencia (`PedidosRepository`, `AuthRepository`).

### Dependencias
- `app.repositories.pedidos_repo.PedidosRepository`: Interacción con la base de datos para la gestión de pedidos.
- `app.repositories.auth_repo.AuthRepository`: Consulta de permisos y datos del operador.

### Métodos y Especificación

#### `aparcar_documento(cod_documento: int, operador: dict) -> dict`
- **Descripción:** Pausa la preparación de un documento y lo deja en estado "aparcado".
- **Payload/Argumentos:** 
  - `cod_documento`: ID del documento.
  - `operador`: Diccionario con la sesión del operador, requiere `cod_operador`.
- **Retorno:** `{"success": True, "res": <resultado>}`
- **Excepciones:** Captura cualquier excepción genérica y levanta una nueva con un mensaje descriptivo.

#### `get_documentos_aparcados(operador_context: dict) -> list`
- **Descripción:** Obtiene una lista de los documentos que han sido aparcados.
- **Lógica:** Extrae `cod_operador` y `terminal`. Consulta `AuthRepository` para obtener los permisos del operador en tiempo real y filtrar los documentos según esos permisos.
- **Retorno:** Lista de diccionarios con datos de documentos.

#### `get_documentos_en_preparacion(operador_context: dict) -> list`
- **Descripción:** Lista los documentos que el operador tiene actualmente en proceso de preparación.

#### `finalizar_documento(cod_documento: int, operador_context: dict, despreciar_restos: bool = False, num_bultos: int = None) -> dict`
- **Descripción:** Concluye el proceso de un documento.
- **Lógica de Permisos:** Verifica el permiso `PRM_DESPRECIARRESTOSDOCCLI`. Solo si el operador solicita `despreciar_restos` (True) y posee el permiso, se enviará un valor de `-1` al repositorio. En caso contrario, se envía `0`.
- **Retorno:** `{"success": True, "codigo_resultado": <int>}`

#### `get_lineas_documento(cod_documento: int) -> list`
- **Descripción:** Retorna las líneas (artículos, cantidades) que componen un pedido específico.

#### `recuperar_documento(cod_documento: int, operador_context: dict, cod_terminal: int) -> dict`
- **Descripción:** Reanuda la preparación de un documento que estaba aparcado.
- **Lógica de Validación Cruzada:**
  - Requiere el permiso `PRM_RECUPERARDOCUMENTOAPARCADO`.
  - Si el documento fue aparcado por otro operario, requiere `PRM_RECUPERARDOCOTROOPERARIO`.
  - Si el documento fue aparcado en otro terminal, requiere `PRM_RECUPERARDOCOTROTERMINAL`.
- **Excepciones:** Levanta `PermissionError` si falla alguna validación.

---

## Parte 2: Manual de Usuario (Para Operadores)

### Gestión de Pedidos

Este manual te explica cómo usar las funciones de preparación de pedidos en tu terminal de almacén.

#### 1. Ver Pedidos en Preparación
Si deseas ver los pedidos en los que estás trabajando actualmente, dirígete a la opción de **"En Preparación"**. El sistema listará automáticamente los documentos asignados a ti en tu terminal actual.

#### 2. Aparcar un Pedido
Si necesitas detener temporalmente la preparación de un pedido (por ejemplo, para ir a buscar un material especial o tomar un descanso), puedes **"Aparcar"** el pedido.
- **Pasos:** En la pantalla del pedido, selecciona la opción "Aparcar". El pedido quedará pausado de forma segura y podrás retomarlo más tarde.

#### 3. Recuperar un Pedido Aparcado
Para continuar trabajando con un pedido que habías pausado, ve a la lista de **"Pedidos Aparcados"**.
- Selecciona el pedido que deseas continuar y pulsa "Recuperar".
- **Nota sobre permisos:** Si ves un error que indica que no tienes permiso, puede deberse a que el pedido fue aparcado por un compañero o en otra máquina. Si necesitas recuperar este tipo de pedidos, solicita autorización a tu supervisor.

#### 4. Finalizar un Pedido
Una vez que hayas recolectado todos los artículos del pedido:
- Pulsa el botón **"Finalizar"**.
- Si el sistema te lo pide, ingresa el número de bultos (cajas) que componen el pedido.
- Si hay artículos que no se han podido encontrar y se van a dejar sin servir, puedes marcar la opción **"Despreciar restos"** (esta opción solo estará disponible si tienes el permiso correspondiente asignado por tu encargado).

#### 5. Consultar las Líneas de un Pedido
Dentro de cualquier pedido, puedes ver el detalle exacto de lo que tienes que recoger. La pantalla te mostrará cada línea con el artículo y la cantidad requerida.
