"""Utilidades compartidas por los scripts de conversion-medicion (solo biblioteca estándar).

No se ejecuta solo. Lo importan auditar_medicion.py y velocidad.py.
Copiado y recortado del módulo común de un skill hermano para que este skill sea autocontenido.

Contiene:
- fetch(): GET con User-Agent propio, tope de 5 redirecciones y timeout.
- load_target(): URL http(s) o archivo local (para probar con examples/).
- header(), detect_challenge(): cabeceras sin mayúsculas y challenges anti-bot.
- md_table(), normalize_text(), html_to_text().
"""
from __future__ import annotations

import gzip
import html
import re
import socket
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

MAX_REDIRECTS = 5
MAX_BYTES = 4_000_000

UA_BROWSER = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)

CHALLENGE_MARKERS = (
    "cf-chl", "challenge-platform", "just a moment...", "attention required! | cloudflare",
    "cf_chl_opt", "checking your browser", "verify you are human", "ddos-guard",
    "px-captcha", "captcha-delivery", "_incapsula_resource",
)


# ---------------------------------------------------------------- texto

def normalize_text(text: str) -> str:
    """Minúsculas, sin acentos y con espacios colapsados (para buscar nombres)."""
    decomposed = unicodedata.normalize("NFKD", text or "")
    plain = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", plain).strip().lower()


def html_to_text(raw: str) -> str:
    """Quita scripts, estilos y etiquetas; resuelve entidades."""
    no_code = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw or "")
    return html.unescape(re.sub(r"(?s)<[^>]+>", " ", no_code))


def md_table(headers: list[str], rows: list[list]) -> str:
    """Tabla Markdown; escapa barras verticales en las celdas."""
    def cell(value) -> str:
        return str(value).replace("|", "\\|").replace("\n", " ")
    lines = ["| " + " | ".join(cell(h) for h in headers) + " |",
             "|" + "|".join("---" for _ in headers) + "|"]
    lines += ["| " + " | ".join(cell(v) for v in row) + " |" for row in rows]
    return "\n".join(lines)


# ---------------------------------------------------------------- red

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def _decode(raw: bytes, headers) -> str:
    if (headers.get("Content-Encoding") or "").lower() == "gzip":
        try:
            raw = gzip.decompress(raw)
        except OSError:
            pass
    charset = headers.get_content_charset() if hasattr(headers, "get_content_charset") else None
    return raw.decode(charset or "utf-8", errors="replace")


def _single_get(url: str, ua: str, timeout: float) -> dict:
    req = urllib.request.Request(url, headers={
        "User-Agent": ua, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"})
    try:
        resp = _OPENER.open(req, timeout=timeout)
    except urllib.error.HTTPError as err:
        resp = err
    raw = resp.read(MAX_BYTES) if resp.fp is not None else b""
    return {"status": getattr(resp, "status", None) or getattr(resp, "code", None),
            "headers": dict(resp.headers.items()), "body": _decode(raw, resp.headers),
            "location": resp.headers.get("Location")}


def fetch(url: str, ua: str = UA_BROWSER, timeout: float = 15.0) -> dict:
    """GET siguiendo como máximo 5 redirecciones. Nunca reintenta.

    Devuelve dict con: url, final_url, status (int o None), headers, body,
    redirects (lista), error (None, 'timeout', 'demasiadas-redirecciones' o texto).
    """
    result = {"url": url, "final_url": url, "status": None, "headers": {},
              "body": "", "redirects": [], "error": None}
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        try:
            resp = _single_get(current, ua, timeout)
        except (socket.timeout, TimeoutError):
            return {**result, "final_url": current, "error": "timeout"}
        except urllib.error.URLError as err:
            reason = err.reason
            kind = "timeout" if isinstance(reason, (socket.timeout, TimeoutError)) else str(reason)
            return {**result, "final_url": current, "error": kind}
        except (ValueError, OSError) as err:
            return {**result, "final_url": current, "error": str(err)}
        result = {**result, "final_url": current, "status": resp["status"],
                  "headers": resp["headers"], "body": resp["body"]}
        if resp["status"] in (301, 302, 303, 307, 308) and resp["location"]:
            nxt = urllib.parse.urljoin(current, resp["location"])
            result = {**result, "redirects": [*result["redirects"], nxt]}
            current = nxt
            continue
        return result
    return {**result, "error": "demasiadas-redirecciones"}


def header(headers: dict, name: str) -> str | None:
    """Lee una cabecera sin importar mayúsculas."""
    lowered = name.lower()
    return next((v for k, v in headers.items() if k.lower() == lowered), None)


def detect_challenge(resp: dict) -> bool:
    """True si la respuesta parece un challenge anti-bot (Cloudflare u otros)."""
    if (header(resp["headers"], "cf-mitigated") or "").lower() == "challenge":
        return True
    head = (resp.get("body") or "")[:20000].lower()
    return any(marker in head for marker in CHALLENGE_MARKERS)


# ---------------------------------------------------------------- objetivo

def load_target(target: str, timeout: float = 15.0) -> dict:
    """URL http(s) o ruta a un archivo HTML local. Misma forma de dict que fetch()."""
    path = Path(target)
    if path.is_file():
        body = path.read_text(encoding="utf-8", errors="replace")
        return {"url": target, "final_url": path.resolve().as_uri(), "status": 200, "headers": {},
                "body": body, "redirects": [], "error": None}
    if not re.match(r"^https?://", target):
        return {"url": target, "final_url": target, "status": None, "headers": {}, "body": "",
                "redirects": [], "error": "no es URL http(s) ni archivo existente"}
    return fetch(target, timeout=timeout)
