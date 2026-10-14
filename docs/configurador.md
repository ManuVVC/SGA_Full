# Guía para la Creación del Módulo Configurador de Vistas

Este documento detalla toda la información y código necesario para replicar el **Configurador de Vistas** (similar al que tenemos en `WEB_Continuos`) en cualquier otro proyecto Flask.

## 1. Introducción

El Configurador de Vistas es un módulo doble que permite:
1. **A los Administradores:** Definir la estructura de las vistas de datos (qué tablas usar, cómo se relacionan la principal y el detalle, qué columnas existen, qué filtros aplicar, etc.) directamente desde la interfaz, guardando esta configuración en la base de datos SQL.
2. **A los Usuarios Regulares:** Personalizar su visualización (qué columnas de las disponibles quieren ver por defecto, qué plantilla de PDF utilizar, qué logos incluir, etc.), guardando estos ajustes en un registro por usuario/empresa.

## 2. Modelos de Base de Datos (SQLAlchemy)

El primer paso es crear un modelo que almacene la configuración estructural de las vistas. Esta tabla reemplaza el uso de archivos JSON estáticos para la estructura.

```python
# models.py
from sqlalchemy import Column, Integer, String, Text
from .database import Base # Asegúrate de importar tu clase Base declarativa

class VistaConfig(Base):
    """
    Modelo para la configuración estructural de las vistas de datos en BBDD.
    """
    __tablename__ = 'vistas_config'
    id = Column(Integer, primary_key=True)
    empresa_id = Column(String(50), nullable=False, index=True) # Multitenancy
    nombre_vista = Column(String(100), nullable=False, index=True)
    titulo = Column(String(200))
    
    # Definición de las tablas/vistas en SQL
    vista_principal = Column(String(200))
    vista_detalle = Column(String(200))
    id_principal = Column(String(100))
    id_detalle = Column(String(100))
    
    # Posibilidad de usar una query compleja en vez de una tabla simple
    query_sql = Column(Text) 
    
    # Textos serializados en JSON para almacenar arrays o configuraciones complejas
    columnas_por_defecto = Column(Text) 
    columnas_detalle_pdf = Column(Text)
    filtros = Column(Text) 
    order_by = Column(Text)
```

## 3. Carga de Configuración en Memoria (Caché Global)

Para no consultar la base de datos en cada petición, la aplicación debe cargar la configuración de `vistas_config` en el diccionario `app.config` durante el arranque, y actualizarlo cada vez que un administrador modifique algo.

```python
# config_loader.py
import json
from .models import VistaConfig
from .database import db_session

def load_vistas_from_db():
    """
    Carga todas las vistas desde la BBDD a un diccionario en memoria.
    Retorna un diccionario estructurado: { empresa_id: { nombre_vista: { ...datos... } } }
    """
    try:
        vistas = VistaConfig.query.all()
        vistas_dict = {}
        
        for row in vistas:
            if row.empresa_id not in vistas_dict:
                vistas_dict[row.empresa_id] = {}
            
            vista_data = {
                'titulo': row.titulo,
                'vista_principal': row.vista_principal,
                'vista_detalle': row.vista_detalle,
                'id_principal': row.id_principal,
                'id_detalle': row.id_detalle,
                'query_sql': row.query_sql,
                'columnas_por_defecto': json.loads(row.columnas_por_defecto) if row.columnas_por_defecto else [],
                'columnas_detalle_pdf': json.loads(row.columnas_detalle_pdf) if row.columnas_detalle_pdf else [],
                'filtros': json.loads(row.filtros) if row.filtros else [],
                'order_by': json.loads(row.order_by) if row.order_by else []
            }
            vistas_dict[row.empresa_id][row.nombre_vista] = vista_data
            
        return vistas_dict
    except Exception as e:
        print(f"Error al cargar configuración: {e}")
        return {}

# En tu app.py o __init__.py al iniciar:
# app.config['VISTAS'] = load_vistas_from_db()
```

Para las configuraciones de usuario (las preferencias), habitualmente se usa un archivo `usuario.json` o una tabla independiente en BD.

## 4. Rutas y Controladores (Blueprints)

Crea un Blueprint dedicado a la configuración (`config_mgmt_bp`). Necesitarás al menos dos rutas principales.

### 4.1. Configuración de Usuario (`/configuracion`)
Permite al usuario logueado cambiar las columnas que ve y el estilo de sus PDFs.

```python
# config_mgmt/routes.py
from flask import Blueprint, request, session, render_template, current_app, flash, redirect, url_for
from .config_loader import save_user_config # Función que guarde en el usuario.json

config_mgmt_bp = Blueprint('config_mgmt', __name__)

@config_mgmt_bp.route('/configuracion', methods=['GET', 'POST'])
def configuracion_empresa():
    empresa_id = session.get('empresa_id')
    all_vistas = current_app.config.get('VISTAS', {})
    vistas_disponibles = list(all_vistas.get(empresa_id, {}).keys())

    vista_actual = request.args.get('vista', vistas_disponibles[0] if vistas_disponibles else None)
    
    # Cargar y modificar config de usuario (ejemplo usando un dict en memoria/json)
    all_user_config = current_app.config.setdefault('USUARIO', {})
    vista_user_config = all_user_config.setdefault(empresa_id, {}).setdefault(vista_actual, {})

    if request.method == 'POST':
        # Recibir formulario
        columnas = request.form.get('columnas', '').split(',')
        vista_user_config.update({
            'columnas_por_defecto': [col.strip() for col in columnas if col.strip()],
            'plantilla_pdf': request.form.get('plantilla'),
            'logo_pdf': request.form.get('logo'),
            'pie_pdf': request.form.get('pie')
        })
        
        save_user_config(all_user_config)
        flash("Configuración de usuario guardada.", "success")
        return redirect(url_for('config_mgmt.configuracion_empresa', vista=vista_actual))

    return render_template('config/configuracion.html', ...)
```

### 4.2. Configuración Estructural (Administrador) (`/configuracion_vistas`)
Esta es la ruta clave del módulo. Permite operaciones CRUD sobre `VistaConfig`.

```python
@config_mgmt_bp.route('/configuracion_vistas', methods=['GET', 'POST'])
# AÑADIR DECORADORES DE SEGURIDAD PARA LIMITAR A ADMIN AQUI
def configuracion_vistas():
    empresa_id = session.get('empresa_id')
    all_vistas = current_app.config.get('VISTAS', {})
    empresa_vistas = all_vistas.get(empresa_id, {})
    
    vista_actual_name = request.args.get('vista', list(empresa_vistas.keys())[0] if empresa_vistas else None)

    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'create':
            # Crear nueva vista
            new_name = request.form.get('new_view_name')
            nuevo_registro = VistaConfig(empresa_id=empresa_id, nombre_vista=new_name, filtros='[]', columnas_por_defecto='[]')
            db_session.add(nuevo_registro)
            db_session.commit()
            
        elif action == 'save':
            # Actualizar vista existente
            vc = VistaConfig.query.filter_by(empresa_id=empresa_id, nombre_vista=vista_actual_name).first()
            if vc:
                vc.vista_principal = request.form.get('vista_principal')
                vc.vista_detalle = request.form.get('vista_detalle')
                vc.id_principal = request.form.get('id_principal')
                vc.id_detalle = request.form.get('id_detalle')
                vc.query_sql = request.form.get('query_sql')
                vc.filtros = request.form.get('filtros_json') # validado como json previamente
                vc.columnas_por_defecto = request.form.get('columnas_defecto_json')
                db_session.commit()
                
        elif action == 'delete':
            # Eliminar vista
            vc = VistaConfig.query.filter_by(empresa_id=empresa_id, nombre_vista=request.form.get('view_to_delete')).first()
            db_session.delete(vc)
            db_session.commit()
            
        # Refrescar caché en todos los casos
        current_app.config['VISTAS'] = load_vistas_from_db()
        flash("Operación realizada con éxito", "success")
        return redirect(url_for('config_mgmt.configuracion_vistas', vista=vista_actual_name))

    return render_template('config/configuracion_vistas.html', ...)
```

## 5. Plantillas HTML Recomendadas

Se recomienda utilizar un diseño que incluya un menú lateral para elegir entre las diferentes vistas existentes, y un panel principal que muestra el formulario de la vista seleccionada.
Debe existir un botón flotante o sección separada para `Crear Nueva Vista`.

- **configuracion_vistas.html**: Contendrá inputs para Tablas, IDs, y TextAreas para introducir JSON de filtros y columnas. Utiliza JavaScript para formatear y validar los JSON antes de enviar el POST.
- **configuracion.html**: Usará inputs tipo "tags" o select múltiple (ej. Select2) para permitir a los usuarios escoger de forma amigable qué columnas quieren visualizar de entre las permitidas.

## 6. Integración con Reglas de Negocio (Menús y Usuarios)

> **REGLA DE OBLIGADO CUMPLIMIENTO:**
> 1. Al crear este nuevo módulo, debe ser incluido inmediatamente en el **configurador de usuarios**.
> 2. Se debe **dar acceso por defecto al usuario Admin**.
> 3. Al añadir las rutas `/configuracion` y `/configuracion_vistas` al menú principal del sistema, hay que registrarlas en el configurador de menús de la aplicación.
> 4. Los accesos para usuarios regulares a `/configuracion_vistas` estarán desmarcados por defecto.

**Implementación de Reglas:**
- Ve a la tabla o archivo `modulos.json` e inserta el nuevo módulo `"configuracion_vistas"`.
- Asigna los permisos en la tabla `module_access` para el usuario administrador.
- Verifica siempre la autorización en la ruta con un decorador `@admin_required` o consultando la tabla de accesos del usuario logueado.
