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

def run(inputs, output_dir, options):
    reader = read_one(inputs)
    selected = pages(options.get("pages", ""), len(reader.pages))
    outputs = []
    for ordinal, index in enumerate(selected, 1):
        writer = PdfWriter()
        writer.add_page(reader.pages[index])
        outputs.append(save(writer, output_dir, f"pagina-{ordinal:04d}-{index + 1}.pdf"))
    return outputs
