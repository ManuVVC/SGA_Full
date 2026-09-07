# Patrones y Anti-Patrones de Programación en SGA

Esta guía contiene reglas estrictas para el código del SGA, derivadas de errores pasados. Cualquier código nuevo debe cumplir estas pautas.

## 🚫 ANTI-PATRONES (Lo que NO se debe hacer)

### 1. Pseudo-selectores CSS en objetos `style` de React
**NUNCA** utilices cosas como `&:hover` dentro de un atributo `style={{}}` en React. No funcionan y se ignoran silenciosamente.
```jsx
// ❌ MAL
<div style={{ '&:hover': { transform: 'scale(1.02)' } }}>

// ✅ BIEN
<div className="stat-box hover-scale"> <!-- Definido en el .css global -->
```

### 2. Uso de Alertas Nativas (`window.confirm`, `alert`, `prompt`)
**NUNCA** utilices llamadas nativas del navegador. Bloquean el hilo principal y arruinan la UX, especialmente en la PDA.
```jsx
// ❌ MAL
if (window.confirm("¿Seguro?")) { ... }

// ✅ BIEN
<ConfirmDialog isOpen={isOpen} onConfirm={handler} />
```

### 3. Duplicación de Lógica en React
**NUNCA** copies y pegues lógicas genéricas de formateo (ej. Fechas) ni barras de búsqueda completas. Extrae la lógica a `utils/` o componentes genéricos. Todo lo que tenga más de 5 líneas idénticas en dos archivos debe ser abstraído.

### 4. Acoplamiento de Flask `request` en Servicios Backend
**NUNCA** importes `request` desde Flask en la capa de servicios o repositorios.
```python
# ❌ MAL (en auth_service.py)
from flask import request
def login(username, pwd):
    ip = request.headers.get('X-Real-IP')

# ✅ BIEN (auth_service.py)
def login(username, pwd, client_ip):
    # La IP se inyectó desde el route/controller
```

### 5. Control Manual de DB sin Context Manager
**NUNCA** abras una conexión, ejecutes comandos y cierres manualmente usando bloques `try/finally` explícitos en los repositorios. Esto causa fugas de conexión (Connection Leaks).

## 💡 PATRONES RECOMENDADOS (Lo que SÍ se debe hacer)

### 1. Context Managers para Base de Datos
Utiliza siempre la abstracción nativa `get_cursor` de `utils/database.py`.
```python
with db.get_cursor(commit=True) as cursor:
    cursor.execute("INSERT INTO...", variables)
```

### 2. Cacheo Cliente (Session Storage)
Si un parámetro (ej. la configuración del terminal o de un artículo parametrizado estático) se pide en cada carga de vista, cachealo temporalmente.
```jsx
const cached = sessionStorage.getItem('mi_parametro');
if (cached) return JSON.parse(cached);
```

### 3. Clientes HTTP Centralizados
Tanto en PDA (`apiService.js`) como en Frontend (`adminApi.js`), usa siempre la instancia central de Axios. Ésta gestiona de forma automática reintentos, parseo de tokens y 401s. Jamás uses `axios.get()` puro en los componentes.
