"""Utilidades compartidas por los scripts de anuncios-eficiencia (solo biblioteca estándar).

No se ejecuta solo. Lo importan analizar_export.py y costo_objetivo.py.

Contiene:
- normalize_header(): encabezado sin acentos, minúsculas, sin moneda entre paréntesis.
- parse_number(): "$1,234.50", "1.234,50", "12.5 %", "--" → float.
- read_csv_rows(): lee exports de Google Ads y Meta (UTF-8, UTF-16, Latin-1; coma,
  tabulador o punto y coma) y encuentra la fila de encabezados incluso si hay
  renglones de título encima.
- md_table(), fmt_money(), fmt_pct().
"""
from __future__ import annotations

import csv
import io
import re
import unicodedata
from pathlib import Path

ENCODINGS = ("utf-8-sig", "utf-16", "cp1252", "latin-1")
DELIMITERS = (",", "\t", ";")
EMPTY_VALUES = {"", "-", "--", "—", "n/a", "na", "null", "none", " --"}
HEADER_SCAN_ROWS = 15


# ---------------------------------------------------------------- texto
def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def normalize_header(text: str) -> str:
    """'Importe gastado (MXN)' → 'importe gastado'; 'Campaña' → 'campana'."""
    text = strip_accents(str(text)).lower().strip().strip('"').strip()
    text = re.sub(r"\([^)]*\)", " ", text)  # moneda o aclaraciones entre paréntesis
    text = re.sub(r"[^a-z0-9%/.\s_-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_value(text: str) -> str:
    return re.sub(r"\s+", " ", strip_accents(str(text)).lower()).strip()


# ---------------------------------------------------------------- números
_THOUSANDS_COMMA = re.compile(r"^\d{1,3}(,\d{3})+(\.\d+)?$")
_THOUSANDS_DOT = re.compile(r"^\d{1,3}(\.\d{3}){2,}(,\d+)?$")


def parse_number(raw) -> float | None:
    """Convierte un valor de export a float. Devuelve None si la celda está vacía.

    Reglas: quita $, códigos de moneda, % y espacios. Con coma y punto, el último
    separador es el decimal. Solo comas en grupos de 3 → miles. Solo una coma con
    1-2 decimales → coma decimal. Punto con 2+ grupos de 3 → miles (1.234.567).
    """
    if raw is None:
        return None
    text = str(raw).strip()
    if text.lower() in EMPTY_VALUES:
        return None
    negative = text.startswith("(") and text.endswith(")") or text.startswith("-")
    text = re.sub(r"[^\d.,]", "", text)
    if not text or not re.search(r"\d", text):
        return None
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(",", "") if _THOUSANDS_COMMA.match(text) else text.replace(",", ".")
    elif _THOUSANDS_DOT.match(text):
        text = text.replace(".", "")
    try:
        value = float(text)
    except ValueError:
        return None
    return -value if negative else value


# ---------------------------------------------------------------- CSV
def _decode(path: Path) -> str:
    data = path.read_bytes()
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return data.decode("utf-16")
    for enc in ENCODINGS:
        if enc == "utf-16":
            continue
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1", errors="replace")


def _best_delimiter(text: str) -> str:
    sample = text.splitlines()[:HEADER_SCAN_ROWS]
    scores = {d: sum(line.count(d) for line in sample) for d in DELIMITERS}
    return max(scores, key=scores.get)


def read_csv_rows(path: str | Path, is_header) -> tuple[list[str], list[list[str]]]:
    """Lee el CSV y devuelve (encabezados, filas).

    `is_header(cells)` decide qué renglón es el encabezado: los exports de Google
    Ads traen 1-2 renglones de título ("Informe de campaña", el rango de fechas)
    antes de las columnas.
    """
    path = Path(path)
    text = _decode(path)
    rows = list(csv.reader(io.StringIO(text), delimiter=_best_delimiter(text)))
    for idx, row in enumerate(rows[:HEADER_SCAN_ROWS]):
        if is_header(row):
            body = [r for r in rows[idx + 1:] if any(c.strip() for c in r)]
            return row, body
    raise ValueError("no encontré una fila de encabezados con columnas conocidas en los primeros "
                     f"{HEADER_SCAN_ROWS} renglones de {path.name}")


# ---------------------------------------------------------------- salida
def md_table(headers: list[str], rows: list[list]) -> str:
    """Tabla Markdown; escapa barras verticales en las celdas."""
    def cell(value) -> str:
        return str(value).replace("|", "\\|").replace("\n", " ")
    lines = ["| " + " | ".join(cell(h) for h in headers) + " |",
             "|" + "|".join("---" for _ in headers) + "|"]
    lines += ["| " + " | ".join(cell(v) for v in row) + " |" for row in rows]
    return "\n".join(lines)


def fmt_money(value: float | None) -> str:
    return "—" if value is None else f"${value:,.2f}"


def fmt_pct(value: float | None, digits: int = 1) -> str:
    return "—" if value is None else f"{value * 100:.{digits}f}%"


def as_fraction(value: float, name: str) -> float:
    """Acepta 0.35 o 35 (por ciento) y devuelve 0.35. Valida el rango."""
    frac = value / 100 if value > 1 else value
    if not 0 < frac <= 1:
        raise ValueError(f"{name} debe estar entre 0 y 1 (o entre 0 y 100 como porcentaje); recibí {value}")
    return frac
