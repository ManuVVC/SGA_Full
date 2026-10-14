import re

with open('backend/app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("""WHERE u.NOMBRECORTO LIKE :almacen || '-' || :pasillo || '-%'
'
            \"\"\"""", """WHERE u.NOMBRECORTO LIKE :almacen || '-' || :pasillo || '-%'
            \"\"\"""")

with open('backend/app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
