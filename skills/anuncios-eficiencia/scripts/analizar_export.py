#!/usr/bin/env python3
"""Analiza un export CSV de Google Ads o del Administrador de anuncios de Meta.

Detecta solo las columnas (encabezados en español o inglés), agrupa por campaña
y calcula CTR, CPC, costo por resultado (CPL/CPA), tasa de conversión y parte
del gasto. Después marca lo que cuesta dinero:

- ERROR: gasto por encima del umbral con 0 conversiones.
- ERROR: el objetivo o el tipo de resultado parece tráfico, clics, alcance o
  visitas (paga por clic, no por lead ni venta).
- ERROR: el export no trae ninguna columna de conversiones o resultados.
- AVISO: costo por resultado arriba del objetivo (--cpl-objetivo).
- AVISO: los "resultados" casi igualan a los clics (señal de que se cuentan clics).
- AVISO: puja por clics en Google (Maximizar clics / CPC manual).
- AVISO: gasto concentrado en una campaña (más del 60 %).
- AVISO: presupuesto repartido en muchas campañas con pocas conversiones cada una.

No juzga contra benchmarks de otros países: el único corte de costo es el objetivo
propio del negocio (sácalo con costo_objetivo.py).

Uso:
    python3 analizar_export.py export.csv
    python3 analizar_export.py export.csv --plataforma meta --cpl-objetivo 350
    python3 analizar_export.py export.csv --json
Sale con código 1 si hay algún ERROR.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _comun import (fmt_money, fmt_pct, md_table, normalize_header, normalize_value,  # noqa: E402
                    parse_number, read_csv_rows)

SEVERITIES = ("ERROR", "AVISO", "INFO")
DEFAULT_ZERO_CONV_THRESHOLD = 1000.0
CONCENTRATION_SHARE = 0.60
THIN_MIN_CAMPAIGNS = 4
THIN_MEDIAN_CONVERSIONS = 10
RESULTS_LOOK_LIKE_CLICKS = 0.90

# Alias por campo, en orden de preferencia (ya normalizados: sin acentos, minúsculas,
# sin lo que va entre paréntesis).
ALIASES: dict[str, tuple[str, ...]] = {
    "campaign": ("campana", "campaign", "nombre de la campana", "nombre de campana", "campaign name",
                 "nombre del conjunto de anuncios", "ad set name", "nombre del anuncio", "ad name"),
    "cost": ("costo", "coste", "cost", "importe gastado", "amount spent", "gasto", "spend", "inversion"),
    "conversions": ("conversiones", "conversions", "resultados", "results", "clientes potenciales", "leads",
                    "conversaciones con mensajes iniciadas", "messaging conversations started",
                    "compras", "purchases", "todas las conversiones", "all conv.", "all conversions"),
    "clicks": ("clics en el enlace", "link clicks", "clics", "clicks", "clics (todos)", "clicks (all)",
               "interacciones", "interactions"),
    "impressions": ("impresiones", "impressions", "impr.", "impr"),
    "objective": ("objetivo", "objective", "tipo de resultado", "result type", "indicador de resultado",
                  "result indicator", "objetivo de la campana", "campaign objective"),
    "bidding": ("estrategia de oferta", "bid strategy type", "bid strategy", "tipo de estrategia de oferta",
                "estrategia de puja"),
    "campaign_type": ("tipo de campana", "campaign type"),
}

META_MARKERS = ("importe gastado", "amount spent", "resultados", "results", "indicador de resultado",
                "result indicator", "nombre del conjunto de anuncios", "ad set name", "alcance", "reach")
GOOGLE_MARKERS = ("costo", "cost", "impr.", "conversiones", "conversions", "costo/conv.", "cost / conv.",
                  "estrategia de oferta", "bid strategy type", "tipo de campana", "campaign type")

TRAFFIC_HINTS = ("trafico", "traffic", "link_clicks", "link clicks", "clics en el enlace", "clic en el enlace",
                 "visitas", "visits", "visita", "landing page view", "visitas a la pagina de destino",
                 "outcome_traffic", "profile visit", "visitas al perfil", "alcance", "reach", "awareness",
                 "reconocimiento", "brand awareness", "impresiones", "impressions", "thruplay",
                 "reproducciones", "video views", "post engagement", "interaccion con la publicacion",
                 "me gusta", "page likes", "seguidores", "followers")
CONVERSION_HINTS = ("lead", "cliente potencial", "clientes potenciales", "mensaje", "message", "conversacion",
                    "conversation", "venta", "sales", "compra", "purchase", "conversion", "registro",
                    "registration", "outcome_leads", "outcome_sales", "llamada", "call")
CLICK_BIDDING_HINTS = ("maximizar clics", "maximize clicks", "cpc manual", "manual cpc", "cpc mejorado",
                       "enhanced cpc", "target_spend", "manual_cpc")
TOTAL_ROW_PREFIXES = ("total", "totales", "resultados de", "results from")


@dataclass
class Campaign:
    name: str
    cost: float = 0.0
    conversions: float = 0.0
    clicks: float = 0.0
    impressions: float = 0.0
    objectives: set = field(default_factory=set)
    bidding: set = field(default_factory=set)
    types: set = field(default_factory=set)
    traffic_results: float = 0.0  # "resultados" que en realidad son clics o visitas

    def metrics(self, total_cost: float) -> dict:
        def ratio(a: float, b: float) -> float | None:
            return a / b if b else None
        return {"ctr": ratio(self.clicks, self.impressions), "cpc": ratio(self.cost, self.clicks),
                "cpl": ratio(self.cost, self.conversions), "tasa_conversion": ratio(self.conversions, self.clicks),
                "parte_del_gasto": ratio(self.cost, total_cost)}


# ---------------------------------------------------------------- columnas
def map_columns(headers: list[str]) -> dict[str, int]:
    """Campo → índice de columna, respetando el orden de preferencia de ALIASES."""
    norm = [normalize_header(h) for h in headers]
    mapping: dict[str, int] = {}
    for fld, aliases in ALIASES.items():
        for alias in aliases:
            if alias in norm and norm.index(alias) not in mapping.values():
                mapping[fld] = norm.index(alias)
                break
    return mapping


def looks_like_header(cells: list[str]) -> bool:
    found = map_columns(cells)
    return "campaign" in found and "cost" in found


def detect_platform(headers: list[str]) -> str:
    norm = {normalize_header(h) for h in headers}
    meta = sum(1 for m in META_MARKERS if m in norm)
    google = sum(1 for m in GOOGLE_MARKERS if m in norm)
    return "meta" if meta > google else "google"


# ---------------------------------------------------------------- lectura
def is_total_row(name: str) -> bool:
    low = normalize_value(name)
    return not low or low.startswith(TOTAL_ROW_PREFIXES)


def aggregate(headers: list[str], rows: list[list[str]], mapping: dict[str, int]) -> list[Campaign]:
    """Suma filas por campaña (los exports por día o por anuncio repiten la campaña)."""
    campaigns: dict[str, Campaign] = {}

    def cell(row: list[str], fld: str) -> str:
        idx = mapping.get(fld)
        return row[idx] if idx is not None and idx < len(row) else ""

    for row in rows:
        name = cell(row, "campaign").strip()
        if is_total_row(name):
            continue
        camp = campaigns.setdefault(name, Campaign(name=name))
        for fld in ("cost", "conversions", "clicks", "impressions"):
            setattr(camp, fld, getattr(camp, fld) + (parse_number(cell(row, fld)) or 0.0))
        for fld, bucket in (("objective", camp.objectives), ("bidding", camp.bidding), ("campaign_type", camp.types)):
            value = cell(row, fld).strip()
            if value and value not in ("--", "-"):
                bucket.add(value)
    for camp in campaigns.values():
        if objective_is_traffic(camp):
            # Un clic no es un lead: se reporta aparte y no entra al costo por resultado.
            camp.traffic_results, camp.conversions = camp.conversions, 0.0
    return list(campaigns.values())


# ---------------------------------------------------------------- reglas
def _has_hint(values: set, hints: tuple[str, ...]) -> bool:
    return any(h in normalize_value(v) for v in values for h in hints)


def objective_is_traffic(camp: Campaign) -> bool:
    if not camp.objectives:
        return False
    return _has_hint(camp.objectives, TRAFFIC_HINTS) and not _has_hint(camp.objectives, CONVERSION_HINTS)


def campaign_flags(camp: Campaign, m: dict, args: argparse.Namespace, has_conv_col: bool) -> list[tuple[str, str]]:
    flags: list[tuple[str, str]] = []
    threshold = args.umbral if args.umbral is not None else (
        2 * args.cpl_objetivo if args.cpl_objetivo else DEFAULT_ZERO_CONV_THRESHOLD)
    if camp.cost > 0 and objective_is_traffic(camp):
        flags.append(("ERROR", "el objetivo/resultado parece tráfico, clics, visitas o alcance ("
                      + ", ".join(sorted(camp.objectives)) + f"): {camp.traffic_results:,.0f} resultados que no son "
                      f"leads ni ventas, {fmt_money(camp.cost)} sin conversión. Cambia a Clientes potenciales, "
                      "Mensajes o Ventas"))
    elif has_conv_col and camp.conversions == 0 and camp.cost >= threshold:
        flags.append(("ERROR", f"gastó {fmt_money(camp.cost)} con 0 conversiones (umbral {fmt_money(threshold)})"))
    elif (camp.conversions > 0 and camp.clicks > 0
          and camp.conversions >= RESULTS_LOOK_LIKE_CLICKS * camp.clicks):
        flags.append(("AVISO", f"los resultados ({camp.conversions:,.0f}) casi igualan a los clics "
                      f"({camp.clicks:,.0f}): revisa si el 'resultado' es un clic y no un lead"))
    if camp.cost > 0 and _has_hint(camp.bidding, CLICK_BIDDING_HINTS):
        flags.append(("AVISO", "puja por clics (" + ", ".join(sorted(camp.bidding))
                      + "): con conversión medida, pasa a una estrategia de conversiones"))
    if args.cpl_objetivo and m["cpl"] is not None and m["cpl"] > args.cpl_objetivo:
        flags.append(("AVISO", f"costo por resultado {fmt_money(m['cpl'])} arriba del objetivo "
                      f"{fmt_money(args.cpl_objetivo)} ({m['cpl'] / args.cpl_objetivo:.1f}×)"))
    if m["parte_del_gasto"] is not None and m["parte_del_gasto"] > CONCENTRATION_SHARE:
        flags.append(("AVISO", f"concentra {fmt_pct(m['parte_del_gasto'])} del gasto: confirma que es la que "
                      "mejor convierte antes de dejarle el presupuesto"))
    return flags


def account_flags(campaigns: list[Campaign], has_conv_col: bool) -> list[tuple[str, str]]:
    flags: list[tuple[str, str]] = []
    if not has_conv_col:
        flags.append(("ERROR", "el export no trae columna de conversiones ni de resultados: no se puede medir "
                      "eficiencia. Agrega la columna o configura primero la medición"))
        return flags
    spending = [c for c in campaigns if c.cost > 0]
    if len(spending) >= THIN_MIN_CAMPAIGNS:
        median = statistics.median(c.conversions for c in spending)
        if median < THIN_MEDIAN_CONVERSIONS:
            flags.append(("AVISO", f"{len(spending)} campañas con gasto y mediana de {median:g} conversiones: el "
                          "presupuesto está repartido; ninguna junta datos para optimizar. Consolida"))
    if spending and sum(c.conversions for c in spending) == 0:
        flags.append(("ERROR", "toda la cuenta gastó sin una sola conversión registrada: o no hay medición o "
                      "no hay resultados. Revisa la medición antes de tocar campañas"))
    return flags


# ---------------------------------------------------------------- salida
def build_report(path: str, args: argparse.Namespace) -> dict:
    headers, rows = read_csv_rows(path, looks_like_header)
    mapping = map_columns(headers)
    platform = args.plataforma or detect_platform(headers)
    campaigns = aggregate(headers, rows, mapping)
    if not campaigns:
        raise ValueError("el export no trae filas de campaña")
    total_cost = sum(c.cost for c in campaigns)
    has_conv_col = "conversions" in mapping
    detail = []
    for camp in sorted(campaigns, key=lambda c: c.cost, reverse=True):
        m = camp.metrics(total_cost)
        detail.append({"campana": camp.name, "costo": round(camp.cost, 2), "conversiones": camp.conversions,
                       "clics": camp.clicks, "impresiones": camp.impressions,
                       "resultados_de_trafico": camp.traffic_results,
                       "objetivo": sorted(camp.objectives), "estrategia_oferta": sorted(camp.bidding),
                       **{k: (round(v, 4) if v is not None else None) for k, v in m.items()},
                       "problemas": [{"severidad": s, "mensaje": t}
                                     for s, t in campaign_flags(camp, m, args, has_conv_col)]})
    total_conv = sum(c.conversions for c in campaigns)
    return {"archivo": Path(path).name, "plataforma": platform,
            "columnas_detectadas": {k: headers[v] for k, v in mapping.items()},
            "cpl_objetivo": args.cpl_objetivo, "costo_total": round(total_cost, 2),
            "conversiones_totales": total_conv,
            "cpl_total": round(total_cost / total_conv, 2) if total_conv else None,
            "cuenta": [{"severidad": s, "mensaje": t} for s, t in account_flags(campaigns, has_conv_col)],
            "campanas": detail}


def render_markdown(rep: dict) -> str:
    all_flags = rep["cuenta"] + [p for c in rep["campanas"] for p in c["problemas"]]
    counts = " · ".join(f"{s}: {sum(1 for f in all_flags if f['severidad'] == s)}" for s in SEVERITIES)
    head = (f"# Eficiencia de anuncios: {rep['archivo']}\n\n"
            f"Plataforma: **{rep['plataforma']}** · Gasto total {fmt_money(rep['costo_total'])} · "
            f"Conversiones {rep['conversiones_totales']:,.0f} · Costo por resultado {fmt_money(rep['cpl_total'])} · "
            f"Objetivo {fmt_money(rep['cpl_objetivo'])}\n\n{counts}\n\n"
            "Columnas: " + ", ".join(f"{k} = «{v}»" for k, v in rep["columnas_detectadas"].items()))
    rows = [[c["campana"], fmt_money(c["costo"]), fmt_pct(c["parte_del_gasto"]), f"{c['impresiones']:,.0f}",
             f"{c['clics']:,.0f}", fmt_pct(c["ctr"], 2), fmt_money(c["cpc"]), f"{c['conversiones']:,.0f}",
             fmt_pct(c["tasa_conversion"], 2), fmt_money(c["cpl"]), len(c["problemas"])] for c in rep["campanas"]]
    table = md_table(["Campaña", "Costo", "% gasto", "Impr.", "Clics", "CTR", "CPC", "Conv.", "Tasa conv.",
                      "Costo/resultado", "Problemas"], rows)
    lines = [f"- **{f['severidad']}** cuenta: {f['mensaje']}" for f in rep["cuenta"]]
    for camp in rep["campanas"]:
        for f in sorted(camp["problemas"], key=lambda x: SEVERITIES.index(x["severidad"])):
            lines.append(f"- **{f['severidad']}** {camp['campana']}: {f['mensaje']}")
    return f"{head}\n\n{table}\n\n## Hallazgos\n\n" + ("\n".join(lines) or "Sin problemas.") + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Analyze a Google Ads or Meta Ads Manager CSV export per campaign "
                    "(CTR, CPC, cost per result, conversion rate, spend share) and flag waste.")
    parser.add_argument("csv", help="CSV export (Spanish or English headers; UTF-8 or UTF-16)")
    parser.add_argument("--plataforma", choices=("google", "meta"), help="force platform (default: auto-detect)")
    parser.add_argument("--cpl-objetivo", type=float, help="business target cost per lead/acquisition "
                        "(from costo_objetivo.py)")
    parser.add_argument("--umbral", type=float, help="spend with 0 conversions that triggers an ERROR "
                        f"(default: 2× --cpl-objetivo, or {DEFAULT_ZERO_CONV_THRESHOLD:g})")
    parser.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    args = parser.parse_args(argv)
    if args.cpl_objetivo is not None and args.cpl_objetivo <= 0:
        parser.error("--cpl-objetivo must be greater than 0")
    try:
        rep = build_report(args.csv, args)
    except (OSError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(rep, ensure_ascii=False, indent=2) if args.json else render_markdown(rep))
    flags = rep["cuenta"] + [p for c in rep["campanas"] for p in c["problemas"]]
    return 1 if any(f["severidad"] == "ERROR" for f in flags) else 0


if __name__ == "__main__":
    sys.exit(main())
