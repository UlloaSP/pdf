from pathlib import Path
import math
from pypdf import PdfReader, PdfWriter


def number(options, key, default, minimum=0):
    try:
        value = float(options.get(key, default))
    except (TypeError, ValueError):
        raise ValueError(f"{key}: introduce un número válido.") from None
    if not math.isfinite(value) or value < minimum:
        raise ValueError(f"{key}: valor fuera de rango.")
    return value


def read_one(inputs):
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un PDF.")
    reader = PdfReader(inputs[0])
    if reader.is_encrypted:
        raise ValueError("Desbloquea el PDF antes de usar esta utilidad.")
    if not reader.pages:
        raise ValueError("El PDF no contiene páginas.")
    return reader


def pages(spec, count):
    if not str(spec).strip():
        return list(range(count))
    result = []
    try:
        for part in str(spec).split(','):
            bounds = [int(x.strip()) for x in part.split('-')]
            if len(bounds) == 1:
                start = end = bounds[0]
            elif len(bounds) == 2:
                start, end = bounds
            else:
                raise ValueError()
            if not 1 <= start <= end <= count:
                raise ValueError()
            result.extend(range(start - 1, end))
    except (TypeError, ValueError):
        raise ValueError("Páginas inválidas. Usa números desde 1, por ejemplo 1,3-5.") from None
    return result


def save(writer, output_dir, name):
    target = Path(output_dir) / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as stream:
        writer.write(stream)
    return str(target)

import json
from io import BytesIO
from reportlab.pdfgen import canvas
from pypdf import Transformation


def latin(value):
    if not isinstance(value, str):
        raise ValueError("El valor del campo de texto debe ser texto.")
    try:
        value.encode('cp1252')
    except UnicodeEncodeError:
        raise ValueError("Los campos nuevos admiten texto Windows-1252.") from None
    return value


def create(reader, output_dir, definitions):
    if reader.get_fields():
        raise ValueError("Crear campos requiere un PDF sin formulario existente. Usa Rellenar para editar sus valores.")
    if not isinstance(definitions, list) or not definitions:
        raise ValueError("Define una lista JSON de campos nuevos.")
    base = PdfWriter(clone_from=reader)
    for page in base.pages:
        if page.rotation and page.get('/Annots'):
            raise ValueError("No se crean campos en páginas rotadas con anotaciones. Aplana antes las anotaciones.")
        page.transfer_rotation_to_content()
    seen = set()
    for item in definitions:
        if not isinstance(item, dict): raise ValueError("Cada campo debe ser un objeto JSON.")
        name = item.get('name', '')
        if not isinstance(name, str) or not name.strip() or name in seen or '.' in name:
            raise ValueError("Los nombres de campo deben ser únicos y no contener puntos.")
        latin(name)
        seen.add(name)
        kind = item.get('type', 'text')
        if kind not in ('text', 'checkbox'): raise ValueError("Tipo de campo válido: text o checkbox.")
        page_number = number(item, 'page', 1, 1)
        if not page_number.is_integer() or page_number > len(base.pages): raise ValueError("Página de campo inválida.")
        box = base.pages[int(page_number)-1].cropbox
        x, y = number(item,'x',36), number(item,'y',36)
        width = number(item,'width',160 if kind == 'text' else 20,1)
        height = number(item,'height',24 if kind == 'text' else width,1)
        if kind == 'checkbox': height = width
        if x+width > box.width or y+height > box.height: raise ValueError("El campo no cabe en la página.")
        if kind == 'text': latin(item.get('value',''))
        elif not isinstance(item.get('value',False),bool): raise ValueError("Una casilla usa true o false.")
    buffer=BytesIO()
    c=canvas.Canvas(buffer)
    for index,page in enumerate(base.pages,1):
        c.setPageSize((float(page.cropbox.width),float(page.cropbox.height)))
        for item in definitions:
            if int(item.get('page',1)) != index: continue
            kwargs = dict(name=item['name'],x=float(item.get('x',36)),y=float(item.get('y',36)),forceBorder=True)
            if item.get('type','text') == 'text':
                c.acroForm.textfield(**kwargs,width=float(item.get('width',160)),height=float(item.get('height',24)),value=item.get('value',''))
            else:
                c.acroForm.checkbox(**kwargs,size=float(item.get('width',20)),checked=item.get('value',False))
        c.showPage()
    c.save()
    writer=PdfWriter(clone_from=PdfReader(buffer))
    for target,original in zip(writer.pages,base.pages):
        target.merge_transformed_page(original,Transformation().translate(-float(original.cropbox.left),-float(original.cropbox.bottom)),over=False)
    return [save(writer,output_dir,'formulario-nuevo.pdf')]


def run(inputs, output_dir, options):
    reader = read_one(inputs)
    mode = options.get('mode','Rellenar')
    if mode not in ('Rellenar','Crear campos'): raise ValueError("Modo de formulario inválido.")
    try:
        values = json.loads(options.get("definitions" if mode == 'Crear campos' else "values", "{}"))
    except (TypeError, json.JSONDecodeError):
        raise ValueError("Introduce un objeto JSON válido.") from None
    if mode == 'Crear campos': return create(reader,output_dir,values)
    if not isinstance(values, dict) or not values or not all(isinstance(k,str) and isinstance(v,(str,bool)) for k,v in values.items()):
        raise ValueError("Indica nombres y valores de texto o booleanos en un objeto JSON.")
    fields = reader.get_fields() or {}
    if not fields: raise ValueError("El PDF no contiene campos AcroForm.")
    for key in values:
        if key not in fields: raise ValueError(f"Campo desconocido: {key}. Disponibles: {', '.join(fields)}")
        kind = fields[key].get('/FT')
        if kind == '/Tx':
            if not isinstance(values[key],str): raise ValueError(f"{key}: introduce texto.")
        elif kind == '/Btn' and not int(fields[key].get('/Ff',0)) & ((1 << 15) | (1 << 16)):
            if not isinstance(values[key],bool): raise ValueError(f"{key}: usa true o false para casillas.")
            states = [state for state in fields[key].get('/_States_',[]) if state != '/Off']
            if len(states) != 1: raise ValueError(f"{key}: estados de casilla no reconocidos.")
            values[key] = states[0] if values[key] else '/Off'
        else: raise ValueError(f"{key}: solo se admiten texto y casillas, no radios ni firmas.")
        if int(fields[key].get('/Ff', 0)) & 1: raise ValueError(f"{key}: campo de solo lectura.")
    root = reader.trailer['/Root']
    if '/XFA' in root.get('/AcroForm', {}): raise ValueError("Los formularios XFA no están soportados.")
    writer = PdfWriter(clone_from=reader)
    writer.update_page_form_field_values(None, values, auto_regenerate=False)
    return [save(writer, output_dir, "formulario.pdf")]
