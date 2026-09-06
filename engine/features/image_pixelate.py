from pathlib import Path
import math
import uuid
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageColor


def number(options, key, default, low=0, high=10000, integer=False):
    try:
        raw=options.get(key,default)
        if isinstance(raw,bool): raise ValueError()
        value=float(raw)
        if not math.isfinite(value) or not low <= value <= high or (integer and not value.is_integer()): raise ValueError()
    except (TypeError,ValueError):
        raise ValueError(f"{key}: introduce un número entre {low} y {high}.") from None
    return int(value) if integer else value


def read_image(path):
    try:
        with Image.open(path) as original:
            if original.width*original.height > 40_000_000 or max(original.size)>20000:
                raise ValueError("La imagen supera 40 megapíxeles o 20.000 px por lado.")
            return ImageOps.exif_transpose(original).convert('RGBA')
    except (OSError,Image.DecompressionBombError) as error:
        raise ValueError("No se pudo leer una imagen compatible.") from error


def read_one(inputs):
    if len(inputs)!=1: raise ValueError("Selecciona exactamente una imagen.")
    return read_image(inputs[0])


def save(image,output_dir,prefix):
    folder=Path(output_dir)
    folder.mkdir(parents=True,exist_ok=True)
    target=folder/f"{prefix}-{uuid.uuid4().hex}.png"
    # Rebuild pixels so EXIF and source metadata are not copied into the output.
    clean=Image.frombytes('RGBA',image.size,image.convert('RGBA').tobytes())
    with target.open('xb') as stream: clean.save(stream,format='PNG')
    return [str(target)]


def color(value):
    try: return ImageColor.getcolor(str(value),'RGBA')
    except (ValueError,TypeError): raise ValueError("Color inválido. Usa un nombre o #RRGGBB.") from None


def text_value(value):
    if not isinstance(value,str) or len(value)>2000: raise ValueError("El texto debe tener como máximo 2.000 caracteres.")
    try: value.encode('latin-1')
    except UnicodeEncodeError: raise ValueError("Esta versión admite texto latino Latin-1.") from None
    if any(ord(c)<32 and c!='\n' for c in value): raise ValueError("El texto contiene caracteres de control.")
    return value


def text_layer(text,size,fill,stroke=0):
    font=ImageFont.load_default(size=size)
    draw=ImageDraw.Draw(Image.new('RGBA',(1,1)))
    box=draw.multiline_textbbox((0,0),text,font=font,stroke_width=stroke,align='center')
    width,height=max(1,math.ceil(box[2]-box[0])),max(1,math.ceil(box[3]-box[1]))
    if width*height>40_000_000 or max(width,height)>20000: raise ValueError("Texto demasiado grande.")
    layer=Image.new('RGBA',(width,height))
    ImageDraw.Draw(layer).multiline_text((-box[0],-box[1]),text,font=font,fill=fill,stroke_width=stroke,stroke_fill='black',align='center')
    return layer

import json
from PIL import ImageFilter


def run(inputs,output_dir,options):
    image=read_one(inputs)
    mode=options.get('mode','Pixelar')
    if mode not in ('Pixelar','Difuminar'): raise ValueError("Método desconocido.")
    strength=number(options,'strength',16,2,100,True)
    try: regions=json.loads(options.get('regions','[]'))
    except (TypeError,json.JSONDecodeError): raise ValueError("Las regiones deben ser JSON válido.") from None
    if not isinstance(regions,list) or not 1<=len(regions)<=100: raise ValueError("Indica entre 1 y 100 regiones.")
    boxes=[]
    for item in regions:
        if not isinstance(item,dict) or not all(key in item for key in ('x','y','width','height')): raise ValueError("Cada región necesita x, y, width y height.")
        x,y=number(item,'x',0,0,image.width,True),number(item,'y',0,0,image.height,True)
        width,height=number(item,'width',0,1,image.width,True),number(item,'height',0,1,image.height,True)
        if x+width>image.width or y+height>image.height: raise ValueError("Una región queda fuera de la imagen.")
        boxes.append((x,y,x+width,y+height))
    for box in boxes:
        region=image.crop(box)
        if mode=='Pixelar':
            small=(max(1,math.ceil(region.width/strength)),max(1,math.ceil(region.height/strength)))
            region=region.resize(small,Image.Resampling.BOX).resize(region.size,Image.Resampling.NEAREST)
        else: region=region.filter(ImageFilter.GaussianBlur(strength))
        image.paste(region,box[:2])
    return save(image,output_dir,'ocultada')
