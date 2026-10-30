#!/usr/bin/env bash
# Instala el skill anuncios-eficiencia en Claude Code.
# Uso: desde la carpeta del repo clonado, `bash install.sh`
# Idempotente: se puede correr de nuevo para actualizar.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/anuncios-eficiencia"

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

  /anuncios-eficiencia --auditoria export-google.csv export-meta.csv   diagnóstico sin tocar la cuenta
  /anuncios-eficiencia --meta --plan                                   estructura, creatividades y reglas
  /anuncios-eficiencia --reporte                                       reporte del mes

Scripts sueltos:

  python3 ~/.claude/skills/anuncios-eficiencia/scripts/costo_objetivo.py --ticket 4500 --margen 0.45 --cierre 0.2
  python3 ~/.claude/skills/anuncios-eficiencia/scripts/analizar_export.py export.csv --cpl-objetivo 280
MSG
