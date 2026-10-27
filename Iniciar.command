#!/bin/bash
# Doble clic en Mac: prepara el panel la primera vez y lo abre en el navegador.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Descarga la versión LTS en https://nodejs.org, instálala y vuelve a abrir este archivo."
  read -r -p "Presiona Enter para cerrar…"
  exit 1
fi
[ -d node_modules ] || npm install || { read -r -p "No se pudo instalar. Enter para cerrar…"; exit 1; }
[ -f .env.local ] || npm run setup || { read -r -p "No se pudo preparar. Enter para cerrar…"; exit 1; }
npm start
