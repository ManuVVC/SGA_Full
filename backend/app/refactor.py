import os
import re

files_to_refactor = [
    r'G:\Proyectos\SGA\backend\app\repositories\reubicaciones_repo.py',
    r'G:\Proyectos\SGA\backend\app\repositories\entradas_repo.py'
]

for file_path in files_to_refactor:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern for non-commit (selects)
    # Matches:
    # conn = db.get_connection()
    # cursor = conn.cursor()
    # ... code ...
    # except ... finally ...
    
    # Actually, a regex that captures the `try: \n conn = db.get_connection() \n cursor = conn.cursor() \n ... finally: \n ...` is a bit complex. Let's do it with a Python AST or just simple string replacements.

    # Simple string replacements for the start:
    content = re.sub(
        r'conn\s*=\s*db\.get_connection\(\)\s*cursor\s*=\s*conn\.cursor\(\)',
        r'with db.get_cursor() as cursor:',
        content
    )

    # Now we need to adjust indentation. But `with db.get_cursor() as cursor:` requires the following code to be indented. Wait, if it's already inside `try:`, it's at the same indentation level as `conn = db.get_connection()`. If we replace those two lines with the `with` block, the rest of the code in the `try` block needs to be indented one level.

    # Let's write a smarter script that processes the file line by line.
