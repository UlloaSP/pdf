# Marco y navegación

La aplicación conserva un marco oscuro de 8 px alrededor del contenido. La barra superior aparece al pasar por el borde de arriba; las categorías aparecen desde el borde izquierdo. Ambos paneles flotan sobre la vista y se ocultan al retirar el cursor, sin desplazar las herramientas. El marco permanece dentro de los formularios.

El documento exterior no tiene scroll. El desplazamiento se limita al contenido interior y, si hace falta por altura, al panel de categorías. Los textos accesibles ocultos se posicionan dentro del contenido para no crear una segunda barra exterior.

Con teclado, Tab permite llegar a los bordes y desplegar sus controles; Escape cierra el panel y lleva el foco al contenido. Los paneles cerrados son inertes. En pantallas táctiles se abren tocando el borde y se cierran al tocar fuera. Se respeta la preferencia de movimiento reducido.

Windows utiliza una barra propia con minimizar, maximizar/restaurar y cerrar. La zona del título permite arrastrar la ventana. En la vista web estos controles nativos no se muestran. Las categorías se desactivan mientras se procesa un documento para evitar abandonar un trabajo activo.

Se retiran los mensajes promocionales y de desarrollo, el pie con estado del motor, los contadores visibles y las etiquetas de disponibilidad. Se conservan nombres, descripciones, búsqueda y avisos necesarios dentro de cada utilidad. El recuento permanece accesible para lectores de pantalla.

Validación de interfaz: aparición y cierre con ratón, continuidad al entrar en el panel, foco por teclado y Escape, ausencia de desplazamiento del contenido, búsqueda, las 32 utilidades y vista de 580 px. Las evidencias de build nativo, revisión y CI se registran en la PR de `feature/zen-shell`.

En un contexto Chromium con `hasTouch: true` se comprobó que tocar el borde izquierdo abre el panel y que tocar fuera lo cierra. Es una emulación de entrada táctil; no se ha probado una pantalla táctil física. En el ejecutable Tauri se verificaron los estados reales de maximizar, restaurar y minimizar, el cierre del proceso y la ausencia de scroll exterior. La [PR #39](https://github.com/UlloaSP/pdf/pull/39) registra los resultados.
