# Unilever KPI Signal Finder

AI solution 12 of 14 · Business Analytics · built for **Unilever**

Prepared by **K Bhargav Raju**.

**Live website:** https://bhargavrajuu.github.io/unilever-kpi-signal-finder/

## Problem statement

Senior management receives hundreds of KPIs from different departments but cannot identify which indicators actually explain changes in business performance. Develop an LLM-powered decision-intelligence system that connects operational KPIs with financial outcomes and generates evidence-based executive insights.

## Why Unilever

With hundreds of brands across many countries, Unilever leadership gets a flood of KPIs from every function. This tool tests which ones actually lead changes in margin, drops the noise, and explains the latest quarter in plain words.

## Project structure

```
unilever-kpi-signal-finder/
├── index.html                 Website entry point (served by GitHub Pages)
├── frontend/
│   ├── css/style.css          Layout, typography, light and dark themes
│   └── js/
│       ├── engine.js          Maths, models, charts, page layout and AI analyst panel
│       └── model.js           Sample data and the algorithm for this problem (browser version)
├── app.py                     Streamlit dashboard (Python version of the website)
├── src/
│   ├── data_generator.py      Builds the sample dataset and saves it to data/
│   ├── model.py               The algorithm in Python (pandas, NumPy, scikit-learn)
│   ├── report.py              Writes results to reports/
│   ├── utils.py               Formatting and forecasting helpers
│   └── meta.json              Problem statement, company and algorithm steps
├── data/                      Sample data as CSV
├── reports/                   Results: results.json, summary.md and CSV tables
├── tests/test_model.py        pytest tests for the data and the model
├── requirements.txt
└── pytest.ini
```

## Algorithm

1. **Pull KPIs into one table**: 36 KPIs from 6 functions, aligned by month
2. **Lead-lag scan**: Correlation with margin at lags of 0 to 3 months
3. **Granger-style test**: Does the KPI improve a margin forecast beyond margin's own past?
4. **Drop duplicates**: Remove KPIs that move with a stronger one (|r| > 0.85)
5. **Driver model**: Regression of margin on the shortlisted drivers at their lags
6. **Explain the latest quarter**: Contribution of each driver to the margin change
7. **Flag anomalies**: Latest month vs its own 12-month range
8. **Executive Q&A**: AI analyst answers questions in plain English

The same algorithm is implemented twice: in JavaScript (`frontend/js/model.js`) so the website runs in any browser with no server, and in Python (`src/model.py`) for analysis, the Streamlit dashboard and the tests.

## How to run

**Website:** open the live link above, or open `index.html` in a browser.

**Python:**

```bash
pip install -r requirements.txt
python -m src.data_generator     # create the sample data in data/
python -m src.model              # run the algorithm and write reports/
streamlit run app.py             # open the interactive dashboard
pytest                           # run the tests
```

## Data

One business group: 36 monthly KPIs from 6 functions and operating margin over 48 months (sample data). Files: `data/kpi_catalog.csv`, `data/monthly_kpis.csv`. All figures are illustrative and are not Unilever's actual numbers.

## Results (default settings, Python run)

| Measure | Value | Note |
|---|---|---|
| KPIs reviewed | 36 | From 6 functions |
| Real drivers | 4 | Explain 70% of margin moves |
| Operating margin | 13.1% | -1.24 pts vs prior quarter |
| Safe to drop | 19 | No signal or duplicate |

### Recommended actions

1. **Commodity cost index cost 0.55 pts of margin.** It moved +0.81 vs the prior quarter. Ask the Supply chain leader for a recovery plan with a monthly target.
2. **Rebuild the executive dashboard around 4 drivers.** Commodity cost index, On-shelf availability %, OTIF %, Freight cost per case explain 70% of monthly margin moves. Show each with its lead time.
3. **Retire or demote 19 KPIs.** They add no signal about margin. Move them to function-level reports.

Full output: [`reports/summary.md`](reports/summary.md) and [`reports/results.json`](reports/results.json).

## AI analyst panel

The website includes an "Ask the AI analyst" panel that answers questions about the results through Claude. It works when the page is opened as a Claude artifact on claude.ai. On GitHub Pages the models, charts and controls run in full and the panel shows that it is unavailable.
