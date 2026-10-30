#!/usr/bin/env python3
"""Calcula el costo por lead (CPL) y por adquisición (CPA) que el negocio puede pagar.

Fórmulas (todo en la moneda del ticket):
    utilidad bruta por venta = ticket × margen × compras por cliente
    CPA máximo (punto de equilibrio) = utilidad bruta por venta
    CPL máximo = CPA máximo × tasa de cierre (de lead a venta)
    CPA y CPL objetivo = máximo × (1 − colchón)
    ROAS de equilibrio = 1 / margen   (ingreso por cada peso de anuncio para no perder)

El máximo es el punto donde los anuncios se comen toda la utilidad: pagar eso es
trabajar gratis. El objetivo deja un colchón de utilidad (30 % por defecto).

Uso:
    python3 costo_objetivo.py --ticket 4500 --margen 0.45 --cierre 0.20
    python3 costo_objetivo.py --ticket 4500 --margen 45 --cierre 20 --compras 2.5 --colchon 0.4
    python3 costo_objetivo.py --ticket 4500 --margen 0.45 --cierre 0.2 --json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _comun import as_fraction, fmt_money, fmt_pct, md_table  # noqa: E402

DEFAULT_CUSHION = 0.30


def compute(ticket: float, margin: float, close_rate: float, purchases: float = 1.0,
            cushion: float = DEFAULT_CUSHION) -> dict:
    """Devuelve los cortes de costo. margin, close_rate y cushion como fracción (0-1)."""
    if ticket <= 0:
        raise ValueError("--ticket debe ser mayor que 0")
    if purchases <= 0:
        raise ValueError("--compras debe ser mayor que 0")
    if not 0 <= cushion < 1:
        raise ValueError("--colchon debe estar entre 0 y 1 (0.3 = 30 %)")
    profit = ticket * margin * purchases
    cpa_max = profit
    cpl_max = cpa_max * close_rate
    return {"ticket": ticket, "margen": margin, "tasa_cierre": close_rate, "compras_por_cliente": purchases,
            "colchon": cushion, "utilidad_bruta_por_cliente": round(profit, 2),
            "cpa_maximo": round(cpa_max, 2), "cpl_maximo": round(cpl_max, 2),
            "cpa_objetivo": round(cpa_max * (1 - cushion), 2), "cpl_objetivo": round(cpl_max * (1 - cushion), 2),
            "roas_equilibrio": round(1 / margin, 2),
            "leads_por_venta": round(1 / close_rate, 1)}


def render(r: dict) -> str:
    rows = [["Utilidad bruta por cliente", fmt_money(r["utilidad_bruta_por_cliente"]),
             "ticket × margen × compras"],
            ["CPA máximo (equilibrio)", fmt_money(r["cpa_maximo"]), "arriba de esto, cada venta pierde dinero"],
            ["CPA objetivo", fmt_money(r["cpa_objetivo"]), f"máximo − {fmt_pct(r['colchon'], 0)} de colchón"],
            ["CPL máximo", fmt_money(r["cpl_maximo"]), "CPA máximo × tasa de cierre"],
            ["CPL objetivo", fmt_money(r["cpl_objetivo"]), "el corte para --cpl-objetivo"],
            ["ROAS de equilibrio", f"{r['roas_equilibrio']:.2f}×", "1 / margen (ventas atribuidas ÷ gasto)"],
            ["Leads por venta", f"{r['leads_por_venta']:g}", "1 / tasa de cierre"]]
    head = (f"# Costo objetivo\n\nTicket {fmt_money(r['ticket'])} · margen {fmt_pct(r['margen'], 0)} · "
            f"cierre {fmt_pct(r['tasa_cierre'], 0)} · compras por cliente {r['compras_por_cliente']:g}")
    note = ("\nSi la tasa de cierre es una estimación, dilo en el reporte y recalcula al primer mes con "
            "datos del CRM o de la libreta de ventas.")
    return f"{head}\n\n{md_table(['Corte', 'Valor', 'Cómo sale'], rows)}\n{note}\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Compute the max and target cost per lead / acquisition "
                                     "a business can afford, from ticket, margin and close rate.")
    parser.add_argument("--ticket", type=float, required=True, help="average sale value (e.g. 4500)")
    parser.add_argument("--margen", type=float, required=True, help="gross margin, 0.45 or 45")
    parser.add_argument("--cierre", type=float, required=True, help="lead-to-sale close rate, 0.2 or 20")
    parser.add_argument("--compras", type=float, default=1.0,
                        help="expected purchases per customer (repeat business; default 1)")
    parser.add_argument("--colchon", type=float, default=DEFAULT_CUSHION,
                        help=f"profit cushion kept below break-even (default {DEFAULT_CUSHION})")
    parser.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    args = parser.parse_args(argv)
    try:
        result = compute(args.ticket, as_fraction(args.margen, "--margen"), as_fraction(args.cierre, "--cierre"),
                         args.compras, args.colchon)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else render(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
