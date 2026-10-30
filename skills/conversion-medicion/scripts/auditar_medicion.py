#!/usr/bin/env python3
"""Auditoría de medición de conversiones sobre el HTML crudo (sin ejecutar JavaScript).

Pide la página como un navegador común, NO ejecuta JS, y reporta:

  - etiquetas: GA4 (G-), Google Tag Manager (GTM-), Google Ads (AW-), Universal
    Analytics obsoleto (UA-), píxel de Meta, Microsoft Clarity y Hotjar;
  - plataforma probable (Webflow, Framer u otra);
  - formularios: action, method, redirección, campos visibles, requeridos, tipos
    de input y pistas de plataforma (Webflow `w-form`, Framer);
  - formularios embebidos de terceros (HubSpot, Typeform, Jotform, Tally, Google Forms);
  - enlaces de contacto: WhatsApp (wa.me, api.whatsapp.com), tel: y mailto:;
  - enlaces internos con UTM (no deberían tenerlos) y enlaces a agendas o
    formularios externos sin UTM (se pierde la atribución);
  - si existe un enlace o redirección a una página de gracias.

Severidad: ERROR si hay formularios o enlaces de contacto y no aparece ni GA4 ni
GTM (los contactos no se pueden medir). AVISO para problemas que cuestan datos o
conversiones. INFO para sugerencias.

Limitación: lo que se inyecta con JavaScript (GA4 dentro de GTM, formularios de
code components, botones creados por scripts) no está en el HTML crudo. Un
"no encontrado" se confirma en el navegador con Tag Assistant.

Uso:
    python3 auditar_medicion.py https://www.ejemplo.mx
    python3 auditar_medicion.py https://www.ejemplo.mx/contacto --json
    python3 auditar_medicion.py examples/pagina-webflow-ejemplo.html
Sale con código 1 si hay algún ERROR o si la página no responde.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _comun import detect_challenge, load_target, md_table  # noqa: E402

NON_FIELD_TYPES = {"hidden", "submit", "button", "reset", "image"}
AGENDA_DOMAINS = ("calendly.com", "cal.com", "forms.gle", "docs.google.com/forms", "typeform.com",
                  "tally.so", "jotform.com", "meetings.hubspot.com", "acuityscheduling.com",
                  "setmore.com", "simplybook", "agendapro.com", "doctoralia.")
EMBED_MARKERS = {
    "HubSpot Forms": r"js\.hsforms\.net|hbspt\.forms\.create",
    "Typeform": r"embed\.typeform\.com|form\.typeform\.com",
    "Jotform": r"form\.jotform\.com|jotfor\.ms",
    "Tally": r"tally\.so/embed",
    "Google Forms": r"docs\.google\.com/forms",
    "Calendly (widget)": r"assets\.calendly\.com|calendly-inline-widget",
}
THANKS_RE = re.compile(r"(gracias|thank-?you|thanks|confirmacion|confirmación|enviado|exito|éxito)", re.I)
WA_RE = re.compile(r"^(https?://)?(wa\.me|api\.whatsapp\.com|wa\.link|web\.whatsapp\.com)/|^whatsapp://", re.I)
PHONE_NAME_RE = re.compile(r"tel|phone|whats|celular|movil|móvil|telefono|teléfono", re.I)
EMAIL_NAME_RE = re.compile(r"mail|correo", re.I)
MAX_CAMPOS_SUGERIDOS = 6


# ---------------------------------------------------------------- parser

class ConversionParser(HTMLParser):
    """Recoge formularios con sus campos, enlaces, iframes y señales de plataforma."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.forms: list[dict] = []
        self.links: list[str] = []
        self.iframes: list[str] = []
        self.generator = ""
        self.html_attrs: dict = {}
        self._form: dict | None = None

    def handle_starttag(self, tag, attrs):
        attr = {k.lower(): (v if v is not None else "") for k, v in attrs}
        if tag == "html":
            self.html_attrs = attr
        elif tag == "meta" and attr.get("name", "").lower() == "generator":
            self.generator = attr.get("content", "")
        elif tag == "a" and attr.get("href"):
            self.links.append(attr["href"].strip())
        elif tag == "iframe" and attr.get("src"):
            self.iframes.append(attr["src"])
        elif tag == "form":
            self._form = {"id": attr.get("id", ""), "name": attr.get("data-name") or attr.get("name", ""),
                          "action": attr.get("action", ""), "method": (attr.get("method") or "get").lower(),
                          "redirect": attr.get("data-redirect") or attr.get("redirect", ""),
                          "class": attr.get("class", ""), "campos": []}
            self.forms.append(self._form)
        elif tag in ("input", "select", "textarea") and self._form is not None:
            ftype = (attr.get("type") or "text").lower() if tag == "input" else tag
            if ftype in NON_FIELD_TYPES:
                return
            self._form["campos"].append({
                "tipo": ftype, "nombre": attr.get("name") or attr.get("data-name") or attr.get("id", ""),
                "requerido": "required" in attr or attr.get("aria-required") == "true",
                "autocomplete": attr.get("autocomplete", "")})

    def handle_endtag(self, tag):
        if tag == "form":
            self._form = None


# ---------------------------------------------------------------- detección

def find_tags(raw: str) -> dict:
    def uniq(pattern: str, flags=0) -> list[str]:
        return sorted(set(re.findall(pattern, raw, flags)))
    ga4 = [g for g in uniq(r"\bG-[A-Z0-9]{6,12}\b") if re.search(r"\d", g)]
    meta = sorted(set(uniq(r"fbq\(\s*['\"]init['\"]\s*,\s*['\"](\d{8,20})")
                      + uniq(r"facebook\.com/tr\?id=(\d{8,20})")))
    clarity = sorted(set(uniq(r"clarity\.ms/tag/([a-z0-9]{6,14})", re.I)
                         + uniq(r"['\"]clarity['\"]\s*,\s*['\"]script['\"]\s*,\s*['\"]([a-z0-9]{6,14})['\"]", re.I)))
    hotjar = uniq(r"hjid\s*:\s*(\d{4,10})")
    return {
        "ga4": ga4,
        "gtm": uniq(r"\bGTM-[A-Z0-9]{4,9}\b"),
        "google_ads": uniq(r"\bAW-\d{6,12}\b"),
        "universal_analytics": uniq(r"\bUA-\d{4,10}-\d{1,4}\b"),
        "meta_pixel": meta,
        "meta_pixel_script": "connect.facebook.net" in raw and "fbevents.js" in raw,
        "clarity": clarity,
        "hotjar": hotjar or (["(sin id)"] if "static.hotjar.com" in raw else []),
    }


def detect_platform(raw: str, parser: ConversionParser) -> str:
    gen = parser.generator.lower()
    if "webflow" in gen or "data-wf-site" in parser.html_attrs or "data-wf-page" in parser.html_attrs:
        return "webflow"
    if "framer" in gen or "framerusercontent.com" in raw or "data-framer-" in raw:
        return "framer"
    if "wix.com" in gen or "squarespace" in gen or "wordpress" in gen:
        return gen.split()[0]
    return "desconocida"


def summarize_form(form: dict, platform: str) -> dict:
    campos = form["campos"]
    hint = "webflow" if (form["id"].startswith("wf-form-") or "w-form" in form["class"]) else platform
    problemas = []
    for c in campos:
        nombre = c["nombre"] or "(sin nombre)"
        if PHONE_NAME_RE.search(nombre) and c["tipo"] not in ("tel", "number"):
            problemas.append(f"'{nombre}' parece teléfono y es type='{c['tipo']}' (usa type='tel')")
        if EMAIL_NAME_RE.search(nombre) and c["tipo"] != "email":
            problemas.append(f"'{nombre}' parece correo y es type='{c['tipo']}' (usa type='email')")
    sin_autocomplete = sum(1 for c in campos if c["tipo"] in ("text", "tel", "email") and not c["autocomplete"])
    return {"id": form["id"], "nombre": form["name"], "action": form["action"] or "(ninguno)",
            "method": form["method"], "redireccion": form["redirect"], "plataforma": hint,
            "campos": len(campos), "requeridos": sum(1 for c in campos if c["requerido"]),
            "tipos": sorted({c["tipo"] for c in campos}), "nombres": [c["nombre"] for c in campos],
            "problemas": problemas, "sin_autocomplete": sin_autocomplete}


def dedupe_forms(forms: list[dict]) -> list[dict]:
    """Framer repite bloques por breakpoint: agrupa formularios idénticos."""
    seen: dict = {}
    for f in forms:
        key = (f["action"], f["redireccion"], tuple(f["nombres"]))
        if key in seen:
            seen[key]["repeticiones"] += 1
        else:
            seen[key] = {**f, "repeticiones": 1}
    return list(seen.values())


def has_utm(href: str) -> bool:
    return "utm_" in urllib.parse.urlparse(href).query.lower()


def classify_links(links: list[str], base_url: str) -> dict:
    base = urllib.parse.urlparse(base_url)
    own_host = base.netloc.lower().removeprefix("www.")
    out = {"whatsapp": [], "tel": [], "mailto": [], "agenda": [], "gracias": [],
           "internos_con_utm": [], "agenda_sin_utm": [], "whatsapp_sin_texto": []}
    for href in dict.fromkeys(links):
        low = href.lower()
        if WA_RE.search(href):
            out["whatsapp"].append(href)
            if "text=" not in low:
                out["whatsapp_sin_texto"].append(href)
            continue
        if low.startswith("tel:"):
            out["tel"].append(href)
            continue
        if low.startswith("mailto:"):
            out["mailto"].append(href)
            continue
        if low.startswith(("#", "javascript:")):
            continue
        absolute = urllib.parse.urljoin(base_url, href) if base.scheme.startswith("http") else href
        parts = urllib.parse.urlparse(absolute)
        host = parts.netloc.lower().removeprefix("www.")
        internal = not parts.netloc or (own_host and host == own_host)
        if any(d in low for d in AGENDA_DOMAINS):
            out["agenda"].append(href)
            if not has_utm(href):
                out["agenda_sin_utm"].append(href)
        elif internal:
            if has_utm(href):
                out["internos_con_utm"].append(href)
            if THANKS_RE.search(parts.path or ""):
                out["gracias"].append(href)
    return out


def find_embeds(raw: str, iframes: list[str]) -> list[str]:
    text = raw + " " + " ".join(iframes)
    return [name for name, pattern in EMBED_MARKERS.items() if re.search(pattern, text, re.I)]


# ---------------------------------------------------------------- hallazgos

def collect_issues(rep: dict) -> list[tuple[str, str]]:
    tags, forms, links = rep["etiquetas"], rep["formularios"], rep["enlaces"]
    issues: list[tuple[str, str]] = []
    has_conversions = bool(forms or links["whatsapp"] or links["tel"] or rep["embebidos"])
    has_analytics = bool(tags["ga4"] or tags["gtm"])
    if has_conversions and not has_analytics:
        issues.append(("ERROR", "hay formularios o enlaces de contacto y no aparece GA4 (G-) ni GTM (GTM-) en el HTML crudo: "
                       "los contactos no se pueden medir. Confirma con Tag Assistant por si se inyecta con JS"))
    elif not has_analytics:
        issues.append(("AVISO", "no aparece GA4 ni GTM en el HTML crudo"))
    if not has_conversions:
        issues.append(("AVISO", "no se encontró ningún formulario, WhatsApp, tel: ni embed en el HTML crudo; "
                       "si existen, se inyectan con JS: revísalos en el navegador"))
    if len(tags["ga4"]) > 1:
        issues.append(("AVISO", f"varios IDs de GA4 ({', '.join(tags['ga4'])}): confirma que sean intencionales"))
    if tags["ga4"] and tags["gtm"]:
        issues.append(("INFO", "GA4 directo y GTM a la vez: verifica que GA4 no esté también dentro del contenedor (contaría doble)"))
    if tags["gtm"] and not tags["ga4"]:
        issues.append(("INFO", "hay GTM y ningún G- visible: GA4 probablemente va dentro del contenedor; confírmalo en Tag Assistant"))
    if tags["universal_analytics"]:
        issues.append(("AVISO", f"Universal Analytics ({', '.join(tags['universal_analytics'])}) ya no recoge datos: quítalo"))
    if not tags["meta_pixel"] and not tags["meta_pixel_script"]:
        issues.append(("INFO", "sin píxel de Meta en el HTML crudo (relevante solo si hay anuncios en Meta)"))
    if not tags["google_ads"]:
        issues.append(("INFO", "sin etiqueta de Google Ads (AW-): normal si importas eventos clave desde GA4"))
    for f in forms:
        label = f["nombre"] or f["id"] or "(sin nombre)"
        if f["campos"] > MAX_CAMPOS_SUGERIDOS:
            issues.append(("AVISO", f"formulario '{label}': {f['campos']} campos visibles; revisa cuáles se necesitan para responder"))
        issues += [("AVISO", f"formulario '{label}': {p}") for p in f["problemas"]]
        if f["sin_autocomplete"]:
            issues.append(("INFO", f"formulario '{label}': {f['sin_autocomplete']} campo(s) de texto sin atributo autocomplete"))
        if not f["redireccion"]:
            how = "observa .w-form-done (templates/webflow-generate-lead.js)" if f["plataforma"] == "webflow" \
                else "redirige a /gracias (templates/gracias-generate-lead.js)"
            issues.append(("INFO", f"formulario '{label}': sin redirección a página de gracias; mide el éxito: {how}"))
    if (forms or rep["embebidos"]) and not links["gracias"] and not any(f["redireccion"] for f in forms):
        issues.append(("INFO", "no se encontró enlace ni redirección a una página de gracias"))
    if links["internos_con_utm"]:
        issues.append(("AVISO", f"{len(links['internos_con_utm'])} enlace(s) internos con UTM: sobrescriben la fuente real de la sesión"))
    if links["agenda_sin_utm"]:
        issues.append(("AVISO", f"{len(links['agenda_sin_utm'])} enlace(s) a agenda o formulario externo sin UTM: el contacto ocurre fuera y se pierde la atribución"))
    if links["whatsapp_sin_texto"]:
        issues.append(("INFO", f"{len(links['whatsapp_sin_texto'])} enlace(s) de WhatsApp sin mensaje prellenado (text=)"))
    if links["whatsapp"] or links["tel"]:
        issues.append(("INFO", "el HTML crudo no muestra si los clics a WhatsApp/tel: se miden; verifícalo en DebugView (templates/clics-contacto.js)"))
    return issues


# ---------------------------------------------------------------- salida

def render_markdown(rep: dict) -> str:
    t = rep["etiquetas"]
    def ids(v):
        return ", ".join(v) if v else "no"
    out = [f"# Auditoría de medición\n\nURL: {rep['url']} · status: {rep['status']} · plataforma: {rep['plataforma']}",
           "## Etiquetas (HTML crudo)\n\n" + md_table(["Herramienta", "ID(s)"], [
               ["GA4", ids(t["ga4"])], ["Google Tag Manager", ids(t["gtm"])], ["Google Ads", ids(t["google_ads"])],
               ["Universal Analytics (obsoleto)", ids(t["universal_analytics"])],
               ["Píxel de Meta", ids(t["meta_pixel"]) if t["meta_pixel"] else ("script sin id" if t["meta_pixel_script"] else "no")],
               ["Microsoft Clarity", ids(t["clarity"])], ["Hotjar", ids(t["hotjar"])]])]
    if rep["formularios"]:
        rows = [[f["nombre"] or f["id"] or "-", f["plataforma"], f["action"], f["method"], f["redireccion"] or "-",
                 f["campos"], f["requeridos"], ", ".join(f["tipos"]), f["repeticiones"]] for f in rep["formularios"]]
        out.append("## Formularios\n\n" + md_table(
            ["Nombre", "Plataforma", "Action", "Method", "Redirección", "Campos", "Requeridos", "Tipos", "Veces en HTML"], rows))
    else:
        out.append("## Formularios\n\nNinguno en el HTML crudo.")
    if rep["embebidos"]:
        out.append("Formularios o agendas embebidos: " + ", ".join(rep["embebidos"]))
    lk = rep["enlaces"]
    out.append("## Enlaces de contacto y atribución\n\n" + md_table(["Tipo", "Cantidad", "Ejemplo"], [
        [k, len(lk[k]), (lk[k][0][:80] if lk[k] else "-")] for k in
        ("whatsapp", "tel", "mailto", "agenda", "gracias", "internos_con_utm", "agenda_sin_utm", "whatsapp_sin_texto")]))
    issues = "\n".join(f"- **{sev}** {msg}" for sev, msg in rep["hallazgos"]) or "Sin hallazgos."
    out.append("## Hallazgos\n\n" + issues +
               "\n\nSolo HTML crudo: lo que se inyecta con JavaScript no aparece aquí. Confirma en el navegador.")
    return "\n\n".join(out) + "\n"


def audit(target: str, timeout: float) -> tuple[dict | None, str | None]:
    resp = load_target(target, timeout=timeout)
    if resp["error"]:
        return None, f"no se pudo leer {target}: {resp['error']}"
    if (resp["status"] or 0) >= 400:
        return None, f"{target} respondió {resp['status']}"
    raw = resp["body"]
    parser = ConversionParser()
    try:
        parser.feed(raw)
        parser.close()
    except Exception:  # HTML roto: seguimos con lo que se alcanzó a leer
        pass
    platform = detect_platform(raw, parser)
    forms = dedupe_forms([summarize_form(f, platform) for f in parser.forms])
    rep = {"url": target, "final_url": resp["final_url"], "status": resp["status"], "plataforma": platform,
           "challenge": detect_challenge(resp), "etiquetas": find_tags(raw), "formularios": forms,
           "embebidos": find_embeds(raw, parser.iframes),
           "enlaces": classify_links(parser.links, resp["final_url"])}
    if rep["challenge"]:
        return None, f"{target} devolvió un challenge anti-bot; audita desde el navegador"
    return {**rep, "hallazgos": collect_issues(rep)}, None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Audit conversion tracking in raw HTML (no JavaScript): GA4/GTM/Ads/Meta/Clarity/Hotjar tags, "
                    "forms and fields, WhatsApp/tel/mailto links, UTMs and thank-you page.")
    parser.add_argument("url", help="page URL (http/https) or path to a local HTML file")
    parser.add_argument("--timeout", type=float, default=15.0, help="seconds per request (default 15)")
    parser.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    args = parser.parse_args(argv)
    rep, error = audit(args.url, args.timeout)
    if error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(json.dumps(rep, ensure_ascii=False, indent=2) if args.json else render_markdown(rep))
    return 1 if any(sev == "ERROR" for sev, _ in rep["hallazgos"]) else 0


if __name__ == "__main__":
    sys.exit(main())
