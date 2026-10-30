#!/usr/bin/env bash
# Instala el skill conversion-medicion en Claude Code.
# Uso: desde la carpeta del repo clonado, `bash install.sh`
# Idempotente: se puede correr de nuevo para actualizar.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/conversion-medicion"

if [ ! -f "$SRC/SKILL.md" ]; then
  echo "Error: no encuentro SKILL.md junto a install.sh ($SRC)." >&2
  exit 1
fi

if [ "$SRC" = "$DEST" ]; then
  echo "El skill ya está en $DEST. Nada que copiar."
else
  mkdir -p "$DEST"
  # Copia el contenido (no la carpeta .git) sobre la instalación anterior.
  for item in "$SRC"/* "$SRC"/.[!.]*; do
    [ -e "$item" ] || continue
    case "$(basename "$item")" in
      .git|.github|.DS_Store|__pycache__) continue ;;
    esac
    cp -R "$item" "$DEST/"
  done
  echo "Skill copiado a $DEST"
fi

if command -v python3 >/dev/null 2>&1; then
  echo "python3 encontrado: $(python3 --version 2>&1). Los scripts no necesitan dependencias."
else
  echo "Aviso: no encontré python3. El skill funciona, pero los scripts de scripts/ lo necesitan." >&2
fi

chmod +x "$DEST"/scripts/*.py 2>/dev/null || true

cat <<'MSG'

Listo. En Claude Code:

  /conversion-medicion https://ejemplo.com webflow              flujo completo (pasos 1 a 10)
  /conversion-medicion https://ejemplo.com framer --auditoria   diagnóstico sin tocar el sitio
  /conversion-medicion https://ejemplo.com --velocidad          Core Web Vitals

Scripts sueltos:

  python3 ~/.claude/skills/conversion-medicion/scripts/auditar_medicion.py --help
  python3 ~/.claude/skills/conversion-medicion/scripts/velocidad.py --help

Opcional: export PSI_API_KEY=... para más cuota en PageSpeed Insights.
MSG
