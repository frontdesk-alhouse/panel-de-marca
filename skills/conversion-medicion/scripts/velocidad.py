#!/usr/bin/env python3
"""Core Web Vitals de una URL con la API gratuita de PageSpeed Insights v5.

Llama a https://www.googleapis.com/pagespeedonline/v5/runPagespeed y reporta:

  - CAMPO (CrUX, visitas reales, percentil 75, 28 días): LCP, INP, CLS, FCP y TTFB
    de la URL y, si la URL no tiene datos, del origen. Con pasa / no pasa.
  - LABORATORIO (Lighthouse, una carga simulada): LCP, CLS, TBT (aproximación de
    INP, que el laboratorio no mide), FCP, Speed Index y puntaje de rendimiento.
  - Elemento LCP cuando Lighthouse lo reporta.
  - Las oportunidades principales ordenadas por ahorro estimado.

El veredicto lo dan los datos de campo. Un sitio con poco tráfico no tiene CrUX:
el script lo dice y no inventa el dato.

Clave opcional: variable de entorno PSI_API_KEY. Sin clave la cuota es baja y
puede responder 429; espera o usa una clave de Google Cloud.

Uso:
    python3 velocidad.py https://www.ejemplo.mx
    python3 velocidad.py https://www.ejemplo.mx --estrategia desktop --json
    python3 velocidad.py --desde-json examples/psi-respuesta-ejemplo.json
Sale con 1 si la API falla. Con --estricto, también si alguna métrica de campo no pasa.
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _comun import md_table  # noqa: E402

API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
TIMEOUT_DEFAULT = 90.0
MAX_OPORTUNIDADES = 6

# (clave CrUX, nombre, unidad, bueno, malo, divisor). CLS viene ×100 en CrUX.
CAMPO = (
    ("LARGEST_CONTENTFUL_PAINT_MS", "LCP", "s", 2500, 4000, 1000),
    ("INTERACTION_TO_NEXT_PAINT", "INP", "ms", 200, 500, 1),
    ("CUMULATIVE_LAYOUT_SHIFT_SCORE", "CLS", "", 10, 25, 100),
    ("FIRST_CONTENTFUL_PAINT_MS", "FCP", "s", 1800, 3000, 1000),
    ("EXPERIMENTAL_TIME_TO_FIRST_BYTE", "TTFB", "s", 800, 1800, 1000),
)
CORE = ("LCP", "INP", "CLS")

# (audit id, nombre, unidad, bueno, malo, divisor)
LAB = (
    ("largest-contentful-paint", "LCP", "s", 2500, 4000, 1000),
    ("cumulative-layout-shift", "CLS", "", 0.1, 0.25, 1),
    ("total-blocking-time", "TBT (aprox. INP)", "ms", 200, 600, 1),
    ("first-contentful-paint", "FCP", "s", 1800, 3000, 1000),
    ("speed-index", "Speed Index", "s", 3400, 5800, 1000),
)


def verdict(value: float, good: float, poor: float) -> str:
    if value <= good:
        return "bueno"
    return "mejorar" if value <= poor else "malo"


def fmt(value: float, unit: str, divisor: float) -> str:
    shown = value / divisor
    if unit == "s":
        return f"{shown:.2f} s"
    if unit == "ms":
        return f"{shown:.0f} ms"
    return f"{shown:.2f}"


# ---------------------------------------------------------------- API

def call_psi(url: str, strategy: str, timeout: float) -> tuple[dict | None, str | None]:
    params = [("url", url), ("strategy", strategy), ("category", "performance"), ("locale", "es")]
    key = os.environ.get("PSI_API_KEY", "").strip()
    if key:
        params.append(("key", key))
    req = urllib.request.Request(f"{API}?{urllib.parse.urlencode(params)}",
                                 headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as err:
        detail = ""
        try:
            detail = json.loads(err.read().decode("utf-8")).get("error", {}).get("message", "")
        except (ValueError, OSError):
            pass
        hint = " (cuota agotada: espera unos minutos o define PSI_API_KEY)" if err.code == 429 else ""
        return None, f"la API respondió {err.code}{hint}: {detail[:300]}"
    except (socket.timeout, TimeoutError):
        return None, f"la API no respondió en {timeout:.0f} s (PageSpeed puede tardar; reintenta o sube --timeout)"
    except urllib.error.URLError as err:
        if isinstance(err.reason, (socket.timeout, TimeoutError)):
            return None, f"la API no respondió en {timeout:.0f} s"
        return None, f"sin conexión con la API: {err.reason}"
    except ValueError as err:
        return None, f"respuesta no es JSON: {err}"


# ---------------------------------------------------------------- lectura

def read_field(block: dict | None) -> dict | None:
    """Métricas de CrUX de loadingExperience u originLoadingExperience."""
    metrics = (block or {}).get("metrics") or {}
    if not metrics:
        return None
    rows = []
    for key, name, unit, good, poor, divisor in CAMPO:
        m = metrics.get(key)
        if not m or m.get("percentile") is None:
            continue
        p75 = float(m["percentile"])
        rows.append({"metrica": name, "p75": fmt(p75, unit, divisor), "valor": p75 / divisor,
                     "veredicto": verdict(p75, good, poor), "core": name in CORE})
    return {"alcance": block.get("id", ""), "categoria_global": block.get("overall_category"),
            "origen_fallback": bool(block.get("origin_fallback")), "metricas": rows}


def read_lab(lighthouse: dict) -> dict:
    audits = lighthouse.get("audits") or {}
    rows = []
    for audit_id, name, unit, good, poor, divisor in LAB:
        a = audits.get(audit_id) or {}
        value = a.get("numericValue")
        if value is None:
            continue
        rows.append({"metrica": name, "valor_txt": fmt(value, unit, divisor), "valor": value / divisor,
                     "veredicto": verdict(value, good, poor)})
    score = ((lighthouse.get("categories") or {}).get("performance") or {}).get("score")
    return {"puntaje": None if score is None else round(score * 100), "metricas": rows,
            "lighthouse": lighthouse.get("lighthouseVersion"), "elemento_lcp": lcp_element(audits)}


def lcp_element(audits: dict) -> str | None:
    for audit_id in ("largest-contentful-paint-element", "lcp-breakdown-insight", "lcp-discovery-insight"):
        items = ((audits.get(audit_id) or {}).get("details") or {}).get("items") or []
        for item in items:
            nodes = [item] + list((item.get("items") or [])) if isinstance(item, dict) else []
            for node in nodes:
                n = node.get("node") if isinstance(node, dict) else None
                if isinstance(n, dict) and (n.get("snippet") or n.get("nodeLabel")):
                    return f"{n.get('nodeLabel', '')} · {n.get('snippet', '')}"[:220]
    return None


def opportunities(lighthouse: dict) -> list[dict]:
    """Auditorías con ahorro estimado (formato clásico overallSavingsMs y el nuevo metricSavings)."""
    out = []
    for audit_id, a in (lighthouse.get("audits") or {}).items():
        score = a.get("score")
        if score is None or score >= 0.9 or a.get("scoreDisplayMode") in ("informative", "notApplicable", "manual"):
            continue
        details = a.get("details") or {}
        savings_ms = details.get("overallSavingsMs") or 0
        metric_savings = a.get("metricSavings") or {}
        lcp_ms = metric_savings.get("LCP") or 0
        cls = metric_savings.get("CLS") or 0
        if not (savings_ms or lcp_ms or cls or metric_savings.get("FCP") or metric_savings.get("TBT")):
            continue
        best_ms = max(savings_ms, lcp_ms, metric_savings.get("FCP") or 0, metric_savings.get("TBT") or 0)
        weight = best_ms + cls * 10000
        kb = (details.get("overallSavingsBytes") or 0) / 1024
        out.append({"id": audit_id, "titulo": a.get("title", audit_id), "ahorro_ms": round(best_ms),
                    "ahorro_kb": round(kb), "cls": round(cls, 3), "peso": weight})
    return [{k: v for k, v in o.items() if k != "peso"}
            for o in sorted(out, key=lambda o: o["peso"], reverse=True)[:MAX_OPORTUNIDADES]]


def build_report(data: dict, url: str, strategy: str) -> dict:
    lighthouse = data.get("lighthouseResult") or {}
    page = read_field(data.get("loadingExperience"))
    origin = read_field(data.get("originLoadingExperience"))
    field = page if page and not page["origen_fallback"] else origin
    scope = "url" if field is page and page else ("origen" if field else None)
    core = [m for m in (field or {}).get("metricas", []) if m["core"]]
    passes = None if len(core) < 3 else all(m["veredicto"] == "bueno" for m in core)
    return {"url": url or data.get("id"), "estrategia": strategy,
            "fecha_analisis": data.get("analysisUTCTimestamp"),
            "campo": field, "campo_alcance": scope, "campo_pasa_core_web_vitals": passes,
            "laboratorio": read_lab(lighthouse), "oportunidades": opportunities(lighthouse)}


# ---------------------------------------------------------------- salida

def render_markdown(rep: dict) -> str:
    out = [f"# Velocidad ({rep['estrategia']})\n\nURL: {rep['url']} · análisis: {rep['fecha_analisis'] or 's/f'}"]
    field = rep["campo"]
    if field and field["metricas"]:
        verdict_txt = {True: "PASA", False: "NO PASA", None: "incompleto (faltan métricas de campo)"}[rep["campo_pasa_core_web_vitals"]]
        rows = [[m["metrica"] + (" *" if m["core"] else ""), m["p75"], m["veredicto"]] for m in field["metricas"]]
        out.append(f"## Campo (CrUX, p75, 28 días) · alcance: {rep['campo_alcance']}\n\n"
                   f"Core Web Vitals: **{verdict_txt}**\n\n" + md_table(["Métrica", "p75", "Veredicto"], rows)
                   + "\n\n\\* Core Web Vital.")
    else:
        out.append("## Campo (CrUX)\n\n**Sin datos de campo** para la URL ni el origen (poco tráfico de Chrome). "
                   "El veredicto queda pendiente; trabaja con laboratorio y decláralo así en el reporte.")
    lab = rep["laboratorio"]
    rows = [[m["metrica"], m["valor_txt"], m["veredicto"]] for m in lab["metricas"]]
    out.append(f"## Laboratorio (Lighthouse {lab['lighthouse'] or ''}) · puntaje {lab['puntaje'] if lab['puntaje'] is not None else 's/d'}/100\n\n"
               + (md_table(["Métrica", "Valor", "Veredicto"], rows) if rows else "Sin métricas de laboratorio.")
               + "\n\nEl laboratorio no mide INP; TBT es su aproximación. El puntaje varía entre corridas.")
    if lab["elemento_lcp"]:
        out.append(f"Elemento LCP: `{lab['elemento_lcp']}`")
    if rep["oportunidades"]:
        rows = [[o["titulo"], f"{o['ahorro_ms']} ms" if o["ahorro_ms"] else "-",
                 f"{o['ahorro_kb']} KB" if o["ahorro_kb"] else "-", o["cls"] or "-"] for o in rep["oportunidades"]]
        out.append("## Oportunidades principales\n\n" + md_table(["Oportunidad", "Ahorro estimado", "Bytes", "CLS"], rows))
    else:
        out.append("## Oportunidades principales\n\nNinguna con ahorro estimado relevante.")
    return "\n\n".join(out) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Core Web Vitals via the free PageSpeed Insights API v5: field (CrUX) and lab (Lighthouse) "
                    "LCP/INP/CLS/TBT with pass/fail and top opportunities. Optional key in env PSI_API_KEY.")
    parser.add_argument("url", nargs="?", help="page URL (http/https)")
    parser.add_argument("--estrategia", choices=("mobile", "desktop"), default="mobile", help="default: mobile")
    parser.add_argument("--timeout", type=float, default=TIMEOUT_DEFAULT, help="seconds (default 90)")
    parser.add_argument("--desde-json", metavar="ARCHIVO", help="parse a saved PSI API response instead of calling the API")
    parser.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    parser.add_argument("--estricto", action="store_true", help="exit 1 if field Core Web Vitals do not pass")
    args = parser.parse_args(argv)

    if args.desde_json:
        try:
            data = json.loads(Path(args.desde_json).read_text(encoding="utf-8"))
        except (OSError, ValueError) as err:
            print(f"error: no se pudo leer {args.desde_json}: {err}", file=sys.stderr)
            return 1
    else:
        if not args.url or not args.url.startswith(("http://", "https://")):
            print("error: indica una URL http(s) o usa --desde-json", file=sys.stderr)
            return 1
        print(f"Consultando PageSpeed Insights ({args.estrategia}); puede tardar hasta {args.timeout:.0f} s...",
              file=sys.stderr)
        data, error = call_psi(args.url, args.estrategia, args.timeout)
        if error:
            print(f"error: {error}", file=sys.stderr)
            return 1
    strategy = args.estrategia
    if args.desde_json:
        strategy = ((data.get("lighthouseResult") or {}).get("configSettings") or {}).get("formFactor") or strategy
    rep = build_report(data, args.url or "", strategy)
    print(json.dumps(rep, ensure_ascii=False, indent=2) if args.json else render_markdown(rep))
    return 1 if args.estricto and rep["campo_pasa_core_web_vitals"] is False else 0


if __name__ == "__main__":
    sys.exit(main())
