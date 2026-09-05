# Proteger PDF

Cifrado AES-256 de apertura con pypdf y cryptography. Rechaza documentos ya cifrados. No almacena la contraseña fuera del PDF cifrado. Modificar un documento puede invalidar firmas previas.

Pruebas: `python -m unittest discover -s engine/tests -p test_protect.py -v`.
