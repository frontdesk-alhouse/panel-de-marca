# anuncios-eficiencia (English summary)

A Claude skill (Claude Code or the Claude app) to **audit and fix paid-ads efficiency on Google
Ads and Meta Ads** for small and mid-size businesses in Mexico and Latin America. It checks that
the account measures real conversions, that every campaign pays for the right outcome, computes
the cost per lead the business can afford from its ticket, margin and close rate, and leaves a
structure, negative keywords, a test plan, pause/scale rules and a monthly report.

The skill content is written in Spanish (Mexico). Script `--help` output is in English.

## What it does not promise

- **No promised ROAS, CPL or lead volume.** It promises method: measurement, the right objective,
  a business-specific cost ceiling and rule-based decisions.
- **No US benchmarks.** Costs are judged against what the business can afford.
- **No account changes without permission.** With an MCP connected it reads freely; any write
  needs the owner's explicit approval.

## Failures it catches

- Instagram/Facebook boosts with a Traffic / link-click / profile-visit objective: cheap clicks,
  zero leads.
- Google Ads with no conversion action, or form conversions that never fire.
- Costs judged against foreign averages instead of the business's own target CPL/CPA.
- No negative keywords; broad match with manual CPC burning budget.
- Budget spread across too many campaigns or ad groups to ever exit learning.
- No written rules for when to pause or scale.

## Install

```bash
git clone <this-repo-url> anuncios-eficiencia
cd anuncios-eficiencia
bash install.sh
```

Copies the folder to `~/.claude/skills/anuncios-eficiencia/`, checks for `python3`, prints usage.
Idempotent, no downloads.

## Use

```text
/anuncios-eficiencia --auditoria google.csv meta.csv   audit only, no account changes
/anuncios-eficiencia --google --plan                   structure, negatives, creatives, rules
/anuncios-eficiencia --meta --reporte                  period report
```

Input: CSV exports from Google Ads and Meta Ads Manager (Spanish or English headers), or the
official Meta Ads MCP (`https://mcp.facebook.com/ads`) or a Google Ads MCP when connected.

## Flow

Diagnosis → measurement first (no optimizing without a measured conversion) → right objective →
target CPL from ticket × margin × close rate → structure → negatives and search terms →
creatives → pause/scale rules → report.

## Scripts (Python 3, standard library only)

| Script | Purpose |
|---|---|
| `analizar_export.py` | Auto-detects Google Ads / Meta export columns (ES/EN, UTF-8/UTF-16, comma/tab), computes per-campaign CTR, CPC, cost per result, conversion rate and spend share; flags spend with zero conversions, traffic objectives, missing conversion column (ERROR) and cost above target, click bidding, concentrated or spread-thin budget (AVISO = warning). Exit 1 on ERROR |
| `costo_objetivo.py` | Max and target CPA/CPL, break-even ROAS |

Tests: `python3 -m unittest discover -s tests -v`.

## Evidence

`references/evidencia.md` tags every claim as [E] study, [O] official (Google Ads Help, Meta
Business Help Center, API docs), [S] signal / rule of thumb, or [M] myth. Recent platform changes
(Google Ads API without developer token as of 2026-09-09, the Meta Ads MCP, PMax campaign-level
negatives) are marked **to verify**.

## License

MIT. See [LICENSE](LICENSE).
