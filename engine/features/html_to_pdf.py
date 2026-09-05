from html.parser import HTMLParser
from pathlib import Path

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "head"):
            self.hidden += 1
        if tag in ("p", "div", "br", "li", "h1", "h2", "h3", "tr") and not self.hidden:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "head"):
            self.hidden = max(0, self.hidden - 1)
        if tag in ("p", "div", "li", "h1", "h2", "h3", "tr") and not self.hidden:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un archivo.")
    source = Path(inputs[0])
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    from html import escape
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    try:
        html = source.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        raise ValueError("El archivo HTML debe usar UTF-8.")
    parser = TextParser()
    parser.feed(html)
    lines = [line.strip() for line in "".join(parser.parts).splitlines() if line.strip()]
    if not lines:
        raise ValueError("El HTML no contiene texto visible.")
    try:
        "".join(lines).encode("cp1252")
    except UnicodeEncodeError:
        raise ValueError("Esta conversión admite texto occidental Windows-1252. El HTML contiene caracteres no representables.") from None
    target = out / "converted.pdf"
    styles = getSampleStyleSheet()
    SimpleDocTemplate(str(target)).build([Paragraph(escape(line), styles["BodyText"]) for line in lines])
    return [str(target)]
