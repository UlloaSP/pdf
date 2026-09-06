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

def run(inputs,output_dir,options):
    image=read_one(inputs)
    opacity=number(options,'opacity',50,0,100)/100
    margin=number(options,'margin',10,0,10000,True)
    position=options.get('position','Abajo derecha')
    if position not in ('Arriba izquierda','Arriba derecha','Centro','Abajo izquierda','Abajo derecha'): raise ValueError("Posición desconocida.")
    path=str(options.get('image_path','')).strip()
    if path:
        layer=read_image(path)
        width=number(options,'image_width',100,1,20000,True)
        height=max(1,round(layer.height*width/layer.width))
        if width+2*margin>image.width or height+2*margin>image.height: raise ValueError("La marca no cabe con esos márgenes.")
        layer=layer.resize((width,height),Image.Resampling.LANCZOS)
    else:
        text=text_value(options.get('text','© Mi imagen'))
        if not text.strip(): raise ValueError("Introduce un texto o una imagen de marca.")
        layer=text_layer(text,number(options,'font_size',24,8,300,True),color(options.get('text_color','#ffffff')))
    if layer.width+2*margin>image.width or layer.height+2*margin>image.height: raise ValueError("La marca no cabe con esos márgenes.")
    if position=='Centro': x,y=(image.width-layer.width)//2,(image.height-layer.height)//2
    else:
        x=margin if position.endswith('izquierda') else image.width-layer.width-margin
        y=margin if position.startswith('Arriba') else image.height-layer.height-margin
    layer.putalpha(layer.getchannel('A').point(lambda value:round(value*opacity)))
    image.alpha_composite(layer,(x,y))
    return save(image,output_dir,'marca-agua')
