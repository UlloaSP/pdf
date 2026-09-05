# Entrega de utilidades y Gitflow

Las 32 utilidades del reparto se han integrado mediante sus PR individuales. El [registro de entrega](delivery.md) documenta alcance, limitaciones y validación.

1. Commit inicial en main y publicación de develop.
2. PR de infraestructura: Gitflow persistente, formularios declarativos, selección de archivos, worker aislado, empaquetado Python, pruebas y CI.
3. Tres agentes en worktrees independientes, una rama y PR por utilidad.
4. Revisión cruzada y pruebas por módulo. Integración de infraestructura antes de las utilidades y actualización de sus ramas con develop.
5. Merges a develop tras checks; prueba conjunta, compilación MSI y registro de PRs y límites.

## Reparto

| Agente | Utilidades |
| --- | --- |
| Páginas y edición | merge, split, organize, rotate, crop, watermark, page_numbers, jpg_to_pdf, edit, forms, sign |
| Conversión | pdf_to_jpg, word_to_pdf, powerpoint_to_pdf, excel_to_pdf, pdf_to_word, pdf_to_powerpoint, pdf_to_excel, html_to_pdf, pdf_to_markdown, scan |
| Avanzadas | compress, protect, unlock, repair, pdfa, compare, redact, ocr, summarize, translate, workflow |

## Ajuste técnico

Tauri/Rust mantiene la ventana, el IPC y la supervisión del proceso. Los motores se implementan en Python y se empaquetan con PyInstaller como ejecutable auxiliar del MSI. Esto permite reutilizar pypdf, PDFium, Pillow y bibliotecas Office sin reescribir sus formatos en Rust. El usuario final no necesita Python para los motores integrados. Los ejecutables externos, como LibreOffice, se declaran por utilidad y no se incluyen implícitamente.

Una ejecución tiene directorio de salida único y conserva originales. La cancelación termina el árbol de procesos en Windows; puede dejar una carpeta parcial identificada por su prefijo pdf-utils, que no se anuncia como resultado correcto. El límite de ejecución es de 15 minutos. El progreso inicial es indeterminado, porque los motores no comparten una métrica de avance.

La primera implementación de conversión y edición define un alcance concreto en cada formulario y documento de utilidad. No equivale a fidelidad total con la aplicación de la imagen. Las firmas visuales no son certificados digitales; solicitar firmas a terceros queda fuera de la ejecución local.
