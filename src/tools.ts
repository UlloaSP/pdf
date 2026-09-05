export const categories = [
  "Todas",
  "Páginas",
  "Conversión",
  "Edición",
  "Seguridad",
  "Avanzadas",
] as const;
export type Category = (typeof categories)[number];
export interface Tool {
  name: string;
  description: string;
  category: Exclude<Category, "Todas">;
}

export const tools: Tool[] = [
  {
    name: "Unir PDF",
    description: "Reúne varios documentos en un solo archivo.",
    category: "Páginas",
  },
  {
    name: "Dividir PDF",
    description: "Separa páginas o extrae un intervalo.",
    category: "Páginas",
  },
  {
    name: "Comprimir PDF",
    description: "Reduce el peso ajustando la calidad.",
    category: "Avanzadas",
  },
  {
    name: "PDF a Word",
    description: "Convierte un PDF en un documento editable.",
    category: "Conversión",
  },
  {
    name: "PDF a PowerPoint",
    description: "Transforma documentos en presentaciones.",
    category: "Conversión",
  },
  {
    name: "PDF a Excel",
    description: "Extrae tablas a una hoja de cálculo.",
    category: "Conversión",
  },
  {
    name: "Word a PDF",
    description: "Exporta documentos de Word a PDF.",
    category: "Conversión",
  },
  {
    name: "PowerPoint a PDF",
    description: "Guarda las diapositivas como PDF.",
    category: "Conversión",
  },
  {
    name: "Excel a PDF",
    description: "Convierte hojas de cálculo a PDF.",
    category: "Conversión",
  },
  {
    name: "Editar PDF",
    description: "Añade texto, imágenes y anotaciones.",
    category: "Edición",
  },
  {
    name: "PDF a JPG",
    description: "Exporta páginas o extrae imágenes.",
    category: "Conversión",
  },
  {
    name: "JPG a PDF",
    description: "Crea un documento con tus imágenes.",
    category: "Conversión",
  },
  {
    name: "Firmar PDF",
    description: "Incorpora tu firma al documento.",
    category: "Seguridad",
  },
  {
    name: "Marca de agua",
    description: "Superpone texto o una imagen.",
    category: "Edición",
  },
  {
    name: "Rotar PDF",
    description: "Cambia la orientación de las páginas.",
    category: "Páginas",
  },
  {
    name: "HTML a PDF",
    description: "Convierte contenido HTML a PDF.",
    category: "Conversión",
  },
  {
    name: "Desbloquear PDF",
    description: "Retira protección con la contraseña necesaria.",
    category: "Seguridad",
  },
  {
    name: "Proteger PDF",
    description: "Cifra un documento con contraseña.",
    category: "Seguridad",
  },
  {
    name: "Organizar PDF",
    description: "Ordena, añade y elimina páginas.",
    category: "Páginas",
  },
  {
    name: "PDF a PDF/A",
    description: "Prepara documentos para su archivo.",
    category: "Conversión",
  },
  {
    name: "Reparar PDF",
    description: "Intenta recuperar documentos dañados.",
    category: "Avanzadas",
  },
  {
    name: "Números de página",
    description: "Añade numeración con tu formato.",
    category: "Edición",
  },
  {
    name: "Escanear a PDF",
    description: "Digitaliza documentos en papel.",
    category: "Avanzadas",
  },
  {
    name: "OCR PDF",
    description: "Reconoce texto en páginas escaneadas.",
    category: "Avanzadas",
  },
  {
    name: "Comparar PDF",
    description: "Localiza diferencias entre versiones.",
    category: "Avanzadas",
  },
  {
    name: "Redactar PDF",
    description: "Elimina información sensible de forma permanente.",
    category: "Seguridad",
  },
  {
    name: "Recortar PDF",
    description: "Ajusta el área visible de las páginas.",
    category: "Páginas",
  },
  {
    name: "Formularios PDF",
    description: "Crea y rellena campos interactivos.",
    category: "Edición",
  },
  {
    name: "Resumen IA",
    description: "Obtén una síntesis del documento.",
    category: "Avanzadas",
  },
  {
    name: "Traducir PDF",
    description: "Traduce el contenido a otro idioma.",
    category: "Avanzadas",
  },
  {
    name: "PDF a Markdown",
    description: "Extrae contenido para notas y documentación.",
    category: "Conversión",
  },
  {
    name: "Crear un workflow",
    description: "Encadena operaciones que repites a menudo.",
    category: "Avanzadas",
  },
];
