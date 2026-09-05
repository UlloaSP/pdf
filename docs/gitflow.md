# Gitflow

## Ramas y publicación

`main` contiene versiones entregadas. `develop` integra el trabajo siguiente. Cada utilidad usa `feature/<id>` creada desde `origin/develop` actualizado. Los arreglos usan `fix/<descripcion>`, la infraestructura `chore/<descripcion>`. Publica cada rama y abre una PR con base `develop`; en GitHub PR y merge request son el mismo objeto.

## Secuencia para cada petición

1. Revisa estado y remoto, lee el contrato de features y define alcance y aceptación.
2. Actualiza referencias con fetch y crea una rama desde `origin/develop`. Conserva los cambios ajenos.
3. Implementa un recorrido usable de interfaz a motor y pruebas con documentos reales o generados. Distingue dependencias opcionales de capacidades integradas.
4. Ejecuta comprobaciones. Haz commits Conventional Commits y push con upstream.
5. Abre una PR hacia `develop` con problema, comportamiento, pruebas y límites. Usa un archivo para el cuerpo si llamas a gh.
6. Solicita revisión independiente, corrige hallazgos importantes y espera CI. Si develop cambió en infraestructura compartida, intégralo en la rama, resuelve conflictos y repite los checks afectados. Las utilidades que solo añaden archivos propios pueden integrarse por lote después de probar su unión en un worktree local separado. Registra los heads probados y ejecuta el CI completo sobre develop al cerrar el lote.
7. El coordinador hace merge commit en develop cuando revisión y checks pasan. Conserva las ramas publicadas durante esta entrega para que puedan inspeccionarse.
8. Actualiza el registro de entrega con PR y estado real. Termina en develop con el árbol limpio.

## CodeRabbit

`.coderabbit.yaml` activa revisiones automáticas hacia cualquier rama mediante `base_branches: [".*"]`, incluidos borradores, y revisiones incrementales en cada push sin pausa por número de commits. No filtra por título, etiqueta o autor. CodeRabbit revisa PR; una rama sin PR no genera una revisión.

La configuración se lee desde la rama origen de la PR. Las ramas nuevas la heredan de develop; antes de reutilizar una rama antigua, integra origin/develop para heredar también esta configuración. Mantén el mismo archivo en main mediante una PR que solo sincronice la configuración cuando cambie; esto no publica una release.

Comprueba el comentario de CodeRabbit y sus hallazgos antes del merge, además de CI. Si una PR abierta antes de configurar el bot quedó omitida, actualiza su rama y comenta `@coderabbitai review`. Si persiste «Review skipped», consulta el motivo en «Run configuration» y verifica en la aplicación de CodeRabbit que no haya overrides de organización; el YAML no puede anularlos. Las instrucciones y opciones están en la [documentación oficial](https://docs.coderabbit.ai/configuration/auto-review).

El 5 de septiembre de 2026, CodeRabbit reconoció este YAML en las PR #36 y #37, pero indicó que el repositorio no recibe revisiones automáticas por tener menos de 10 estrellas. Los intentos manuales también terminaron con el límite temporal de revisiones OSS. Son restricciones del servicio, no errores de patrones de ramas. Mientras persistan, solicita revisión manual cuando haya cupo; si el servicio no está disponible, exige revisión independiente y CI, y registra en la PR el motivo y la evidencia de la revisión sustituta. No declares una revisión omitida o limitada como aprobada.

## Trabajo paralelo

Usa hasta tres agentes implementadores junto al coordinador. Cada agente trabaja en su propio worktree y ramas. Cada utilidad mantiene su PR individual aunque un agente complete varias sucesivamente. La infraestructura compartida se integra antes de las utilidades. Evita modificar archivos compartidos desde ramas de utilidad; registra módulos mediante descubrimiento automático.

## Releases

Promociona develop a main mediante PR de release tras validación del instalador. Etiquetas vX.Y.Z solo sobre la versión aprobada de main. Las peticiones de nuevas utilidades autorizan su rama, commits, push, PR y merge a develop dentro de este flujo; no implican publicar una release de producto.
