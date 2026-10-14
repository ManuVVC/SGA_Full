import re

with open('app/routes/admin_routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the inner SELECT and the outer SELECT of get_pasillo_detalle
new_query = '''            SELECT 
                u.NOMBRECORTO,
                v.STOCK,
                v.CAJAS,
                v.CODARTICULOAPLICACION,
                v.NOMBREARTICULO
            FROM GSM.TMST_UBICACIONES u
            LEFT JOIN (
                SELECT NOMBRECORTO, STOCK, CAJAS, CODARTICULOAPLICACION, NOMBREARTICULO
                FROM GSM.VMST_UBICACIONESARTICULO
                WHERE CODALMACEN = :almacen_v
            ) v ON u.NOMBRECORTO = v.NOMBRECORTO
            WHERE u.NOMBRECORTO LIKE :almacen || '-' || :pasillo || '-%'
'''

pattern = r'SELECT \s*u\.NOMBRECORTO,\s*v\.STOCK,\s*v\.CAJAS,\s*v\.CODARTICULO,\s*v\.DESCRIPCION\s*FROM GSM\.TMST_UBICACIONES u\s*LEFT JOIN \(\s*SELECT NOMBRECORTO, STOCK, CAJAS, CODARTICULO, DESCRIPCION\s*FROM GSM\.VMST_UBICACIONESARTICULO\s*WHERE CODALMACEN = :almacen_v\s*\) v ON u\.NOMBRECORTO = v\.NOMBRECORTO\s*WHERE u\.NOMBRECORTO LIKE :almacen \|\| \'-\' \|\| :pasillo \|\| \'-%'''

content = re.sub(pattern, new_query, content, flags=re.DOTALL)

with open('app/routes/admin_routes.py', 'w', encoding='utf-8') as f:
    f.write(content)
