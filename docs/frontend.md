# Frontend

React 19 y TypeScript para componentes y lógica. Tailwind CSS v4 se integra mediante `@tailwindcss/vite` en Vite+. shadcn/ui está inicializado en `components.json`, con base Radix, estilo Nova, iconos Lucide y alias `@/` hacia `src/`.

## Componentes y estilos

Reutiliza `src/components/ui` para botones, tarjetas, campos, controles, pestañas, avisos y confirmaciones. Los formularios se componen con FieldSet, FieldGroup, Field y FieldLabel. NativeSelect conserva el selector nativo; Checkbox, Switch, Slider, ToggleGroup, Tabs y AlertDialog usan Radix. El marco de ventana y la revelación por hover tienen un comportamiento específico de esta app.

Usa clases Tailwind para distribución y espaciado. Define las variantes visuales compartidas en el componente correspondiente y utiliza tokens semánticos como `bg-background`, `text-foreground` y `bg-primary`. `src/styles.css` contiene importaciones, tokens de tema, reglas globales y movimiento reducido; no necesita una configuración JavaScript de Tailwind. Los atributos `data-scheme` y `data-palette` conservan las preferencias existentes. Fuente, tamaño, contraste, opacidad y duración siguen controlados por los ajustes.

Para añadir un componente del registro oficial:

```powershell
vp dlx -- shadcn@latest info
vp dlx -- shadcn@latest docs button
vp dlx -- shadcn@latest add button
```

Inspecciona primero los componentes instalados y consulta sus docs. Revisa el código generado antes de usarlo; el Slider local propaga las etiquetas al control enfocable y Button incluye variantes de ventana cuadradas. No sobrescribas esas adaptaciones al actualizar el registro. `cn` combina clases condicionales y resuelve conflictos de Tailwind.

## TypeScript y comprobaciones

Los scripts Node usan `.mts` con tipos borrables y Node 24. `scripts/tsconfig.json` aplica comprobación estricta sin emitir JavaScript. `vp run build` comprueba tanto la app como los scripts. Los bundles de producción siguen siendo JavaScript y CSS porque son los formatos ejecutados por WebView2; no se guardan como fuentes en Git.

```powershell
vp run check
vp run test
vp run test:updater-manifest
vp run check:version
vp run build
```

Las pruebas del formulario simulan el puente Tauri y verifican el payload, el orden de archivos, los bloqueos y la confirmación de cancelación. Al modificar la interfaz, comprueba también las bibliotecas PDF/Imágenes, los 45 formularios, ajustes claros/oscuros, texto de 18 px y navegación por teclado a 580 × 500. El documento exterior debe permanecer sin scroll; el contenido tiene su propio desplazamiento.
