# conversion-medicion (English summary)

A Claude skill (Claude Code or the Claude app) to **measure and improve conversion** on small and
mid-size business websites built with Webflow, Framer or plain HTML, focused on Mexico and
LatAm: every form submission, WhatsApp click or phone tap reaches GA4 as a key event, gets
imported into Google Ads and Meta, carries consistent UTMs; the form stops scaring people away;
and the site gets out of the red on mobile speed.

The skill content is written in Spanish (Mexico). Script `--help` output is in English.

## The case behind it

A multi-step Framer form logged **15 `form_start` events and 0 submissions** in GA4. Leads were
arriving by email, but for GA4 and the ad platforms they did not exist, so campaigns had nothing
to optimize toward. GA4 key events were left at defaults, mobile LCP was red, WhatsApp and phone
clicks were untracked, and social links had no UTMs.

## What it does not promise

- **Tracking does not create leads; it makes them visible.** The first-month "lift" is light,
  not growth.
- **There is no "correct" conversion rate.** The site is compared against itself, before and after.
- **No "100 on PageSpeed".** The verdict is field data (CrUX, p75, mobile).
- **No "+X% sales per second" claims.** Known studies are large-retail and vendor-sponsored.
- **A WhatsApp click is not a confirmed lead.** It is contact intent and is reported as such.

## Install

```bash
git clone <repo-url> conversion-medicion
cd conversion-medicion
bash install.sh
```

Copies the folder to `~/.claude/skills/conversion-medicion/`, checks for `python3`, prints usage.
Idempotent, no downloads, no `curl | bash`.

## Use

```text
/conversion-medicion https://example.com webflow                full flow (steps 1 to 10)
/conversion-medicion https://example.com framer --auditoria     read-only audit and report
/conversion-medicion https://example.com framer --medicion      tag, events, key event, ads import, UTMs
/conversion-medicion https://example.com webflow --formulario   form friction and submit event
/conversion-medicion https://example.com --velocidad            Core Web Vitals
```

## Flow in short

Conversion inventory (form, WhatsApp, phone, email, booking) → verify the GA4/GTM tag in raw
HTML → success-based submit event per platform (Webflow `.w-form-done` observer, Framer
thank-you page) → mark as key event → import to Google Ads / send to Meta (`Lead`, `Contact`;
CAPI when spend justifies it) → UTMs → form friction → speed (LCP/INP/CLS) → verify in
DebugView/Realtime → report.

## Scripts (Python 3, standard library only)

| Script | Purpose |
|---|---|
| `auditar_medicion.py` | Raw HTML (no JS): GA4, GTM, Google Ads, Meta pixel, Clarity, Hotjar; forms, fields and required fields; WhatsApp/tel/mailto links; UTM issues; thank-you page. Exits 1 when contact points exist with no analytics tag |
| `velocidad.py` | Free PageSpeed Insights API v5: field (CrUX) and lab LCP/INP/CLS/TBT with pass/fail, LCP element and top opportunities. Optional key in `PSI_API_KEY`; `--desde-json` parses a saved response offline |

## Evidence

`references/evidencia.md` tags every claim as [E] study or measured case, [O] official,
[S] judgment or speculative, [M] myth, with source and date. Anything not confirmed at the cut-off
is marked **por verificar** (to be verified) instead of inventing a link.

## License

MIT. See [LICENSE](LICENSE).
