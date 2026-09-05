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


def run(inputs, output_dir, options):
    reader = read_one(inputs)
    try:
        values = json.loads(options.get("values", "{}"))
    except (TypeError, json.JSONDecodeError):
        raise ValueError("Introduce un objeto JSON válido.") from None
    if not isinstance(values, dict) or not values or not all(isinstance(k,str) and isinstance(v,str) for k,v in values.items()):
        raise ValueError("Indica nombres de campo y valores de texto en un objeto JSON.")
    fields = reader.get_fields() or {}
    if not fields: raise ValueError("El PDF no contiene campos AcroForm.")
    for key in values:
        if key not in fields: raise ValueError(f"Campo desconocido: {key}. Disponibles: {', '.join(fields)}")
        if fields[key].get('/FT') != '/Tx': raise ValueError(f"{key}: esta versión solo rellena campos de texto.")
        if int(fields[key].get('/Ff', 0)) & 1: raise ValueError(f"{key}: campo de solo lectura.")
    root = reader.trailer['/Root']
    if '/XFA' in root.get('/AcroForm', {}): raise ValueError("Los formularios XFA no están soportados.")
    writer = PdfWriter(clone_from=reader)
    writer.update_page_form_field_values(None, values, auto_regenerate=False)
    return [save(writer, output_dir, "formulario.pdf")]
