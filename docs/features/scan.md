# Escanear a PDF

Adquiere una página mediante un escáner WIA de Windows o importa una captura JPG/PNG. El modo WIA abre el diálogo de Windows y requiere un dispositivo compatible. Sin captura móvil.

La salida se crea en el directorio de trabajo del motor. Las entradas originales se conservan.

Las pruebas generan documentos locales y comprueban la salida. Las dependencias externas y el hardware se comprueban mediante dobles; su validación real queda pendiente cuando no están instalados.

La adquisición directa utiliza [WIA.CommonDialog](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/wiaaut/-wiaaut-commondialog). No selecciona archivos en modo WIA. Se adquiere una página con límite de 180 segundos; no se ha verificado un alimentador multipágina ni hardware físico. La importación de captura procesa el primer fotograma del archivo.
