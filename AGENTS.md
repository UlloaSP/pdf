# Workflow del proyecto

Antes de implementar una utilidad, corregir un fallo, crear una rama o integrar una PR, lee `docs/gitflow.md` y sigue su secuencia. Cada utilidad tiene una rama y una PR hacia `develop`. Usa worktrees para agentes en paralelo. El coordinador revisa e integra; los agentes no hacen merge.

Consulta `docs/feature-contract.md` antes de añadir un motor o formulario. Ejecuta las comprobaciones pertinentes y documenta las limitaciones verificadas en la PR.

Antes de crear o modificar una interfaz, lee y aplica `.claude/skills/frontend-design/SKILL.md` (skill de frontend de Claude, incluida con su licencia). Es la referencia de diseño para Codex y Claude; respeta las necesidades de accesibilidad y el funcionamiento local de esta aplicación.

Antes de integrar una PR, comprueba el resultado real de CodeRabbit sobre el último commit. Un estado verde que diga «Review skipped» o «Review rate limited» no equivale a revisión. Consulta `docs/gitflow.md` para configurar, recuperar o suplir una revisión bloqueada por el servicio.
