# Unilever KPI Signal Finder: results

Built for Unilever. Prepared by K Bhargav Raju.

## Key figures

- **KPIs reviewed:** 36 (From 6 functions)
- **Real drivers:** 4 (Explain 70% of margin moves)
- **Operating margin:** 13.1% (-1.24 pts vs prior quarter)
- **Safe to drop:** 19 (No signal or duplicate)

## Algorithm, as it ran

1. **Pull KPIs into one table**: 36 KPIs x 48 months
2. **Lead-lag scan**: Strongest lead: Commodity cost index (r 0.71)
3. **Granger-style test**: 4 KPIs significant at p < 0.01
4. **Drop duplicates**: 1 duplicates removed
5. **Driver model**: R² 0.70 with 4 drivers
6. **Explain the latest quarter**: Margin -1.24 pts vs prior quarter
7. **Flag anomalies**: 1 KPIs outside their normal range
8. **Executive Q&A**: Ready

## Recommended actions

1. **Commodity cost index cost 0.55 pts of margin.** It moved +0.81 vs the prior quarter. Ask the Supply chain leader for a recovery plan with a monthly target. *Impact: -0.55 pts*
2. **Rebuild the executive dashboard around 4 drivers.** Commodity cost index, On-shelf availability %, OTIF %, Freight cost per case explain 70% of monthly margin moves. Show each with its lead time. *Impact: 36 -> 4 KPIs*
3. **Retire or demote 19 KPIs.** They add no signal about margin. Move them to function-level reports. *Impact: Less noise*

_Generated from sample data. Figures are illustrative._
