# Ejemplos (datos ficticios)

Todo lo de esta carpeta es inventado: un consultorio dental ficticio, cifras redondeadas para que
los cálculos se puedan seguir a mano. Ningún nombre, cuenta ni cifra viene de un negocio real.

| Archivo | Qué simula | Qué debe marcar `analizar_export.py` |
|---|---|---|
| `google-ads-campanas.csv` | Export de Google Ads en español: dos renglones de título, separador de miles con coma, `$`, fila de total | Performance Max y Display con gasto y 0 conversiones (ERROR); Genérica en concordancia amplia con puja por clics y costo por conversión 5× el objetivo (AVISO) |
| `meta-ads-campanas.csv` | Export del Administrador de anuncios de Meta en español, `Importe gastado (MXN)` | Publicación promocionada con resultado = clics en el enlace (ERROR, ~$0.60 por clic y 0 leads); campaña web sin un solo lead (ERROR: el píxel o la conversión no dispara) |
| `meta-ads-en.csv` | Export de Meta en inglés, `Amount spent (USD)` | Campaña de tráfico (ERROR) |

Corre:

```bash
python3 scripts/costo_objetivo.py --ticket 4500 --margen 0.45 --cierre 0.20
python3 scripts/analizar_export.py examples/google-ads-campanas.csv --cpl-objetivo 280
python3 scripts/analizar_export.py examples/meta-ads-campanas.csv --cpl-objetivo 280
python3 scripts/analizar_export.py examples/meta-ads-en.csv --json
python3 -m unittest discover -s tests -v
```

Con ticket $4,500, margen 45 % y cierre 20 %, el CPL máximo es $405 y el objetivo con 30 % de
colchón es $283.50; por eso los ejemplos usan `--cpl-objetivo 280`.
