"""Pruebas mínimas de los scripts (solo biblioteca estándar).

Corre desde la raíz del skill:
    python3 -m unittest discover -s tests -v
"""
from __future__ import annotations

import argparse
import io
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import analizar_export  # noqa: E402
import costo_objetivo  # noqa: E402
from _comun import parse_number  # noqa: E402

EXAMPLES = ROOT / "examples"


def _args(**kw) -> argparse.Namespace:
    base = {"plataforma": None, "cpl_objetivo": None, "umbral": None, "json": False}
    return argparse.Namespace(**{**base, **kw})


def _flags(report: dict, campaign: str) -> list[str]:
    camp = next(c for c in report["campanas"] if c["campana"] == campaign)
    return [f"{p['severidad']}:{p['mensaje']}" for p in camp["problemas"]]


class ParseNumberTest(unittest.TestCase):
    def test_formats(self) -> None:
        cases = {"$1,234.50": 1234.5, "1.234,50": 1234.5, "12,480.50": 12480.5, "0,60": 0.6,
                 "1,420": 1420.0, "1.234.567": 1234567.0, "12.5 %": 12.5, "--": None, "": None,
                 "MXN 852.00": 852.0}
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(parse_number(raw), expected)


class CostoObjetivoTest(unittest.TestCase):
    def test_formula(self) -> None:
        r = costo_objetivo.compute(4500, 0.45, 0.20)
        self.assertEqual(r["cpa_maximo"], 2025.0)
        self.assertEqual(r["cpl_maximo"], 405.0)
        self.assertEqual(r["cpl_objetivo"], 283.5)
        self.assertEqual(r["roas_equilibrio"], 2.22)

    def test_percent_inputs(self) -> None:
        with redirect_stdout(io.StringIO()):
            self.assertEqual(costo_objetivo.main(["--ticket", "4500", "--margen", "45", "--cierre", "20"]), 0)
            self.assertEqual(costo_objetivo.main(["--ticket", "4500", "--margen", "145", "--cierre", "20"]), 1)


class AnalizarExportTest(unittest.TestCase):
    def test_google(self) -> None:
        rep = analizar_export.build_report(str(EXAMPLES / "google-ads-campanas.csv"), _args(cpl_objetivo=280))
        self.assertEqual(rep["plataforma"], "google")
        self.assertAlmostEqual(rep["costo_total"], 27800.5)
        self.assertEqual(len(rep["campanas"]), 4, "la fila de total no cuenta como campaña")
        self.assertTrue(any(f.startswith("ERROR:gastó") for f in _flags(rep, "Performance Max | Todo")))
        generic = _flags(rep, "Búsqueda | Genérica | Amplia")
        self.assertTrue(any("puja por clics" in f for f in generic))
        self.assertTrue(any("arriba del objetivo" in f for f in generic))
        self.assertEqual(_flags(rep, "Búsqueda | Implantes | Exacta"), [])

    def test_meta_spanish(self) -> None:
        rep = analizar_export.build_report(str(EXAMPLES / "meta-ads-campanas.csv"), _args(cpl_objetivo=280))
        self.assertEqual(rep["plataforma"], "meta")
        self.assertTrue(any("parece tráfico" in f for f in _flags(rep, "Promoción publicación Instagram")))
        self.assertTrue(any(f.startswith("ERROR:gastó") for f in _flags(rep, "Conversiones web | Agenda")))
        self.assertEqual(_flags(rep, "Mensajes WhatsApp | Promo limpieza"), [])

    def test_meta_english_exit_code(self) -> None:
        with redirect_stdout(io.StringIO()):
            code = analizar_export.main([str(EXAMPLES / "meta-ads-en.csv")])
        self.assertEqual(code, 1)

    def test_missing_conversion_column(self) -> None:
        path = Path(self._tmp()) / "sin-conv.csv"
        path.write_text("Campaign,Cost,Clicks,Impressions\nA,\"1,000.00\",200,9000\n", encoding="utf-8")
        rep = analizar_export.build_report(str(path), _args())
        self.assertEqual(rep["cuenta"][0]["severidad"], "ERROR")

    def _tmp(self) -> str:
        import tempfile
        tmp = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(tmp, ignore_errors=True))
        return tmp


if __name__ == "__main__":
    unittest.main()
