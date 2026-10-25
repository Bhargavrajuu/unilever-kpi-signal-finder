"""Find the KPIs that lead operating margin and explain the latest quarter for Unilever."""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression

from src.utils import bar, kpi, line, pct, rec, table

META = json.loads(Path(__file__).with_name("meta.json").read_text())
PARAMS = [{"name": "n_drivers", "label": "Drivers to keep", "min": 3, "max": 10, "step": 1, "default": 6}]
MAX_LAG = 3


def ols_rss(X, y):
    X1 = np.column_stack([np.ones(len(y)), X]); b, *_ = np.linalg.lstsq(X1, y, rcond=None)
    return float(((y - X1 @ b) ** 2).sum())


def run(data, n_drivers=6):
    D, cat = data["monthly_kpis"], data["kpi_catalog"].set_index("kpi")["function"]
    y = D.operating_margin_pct.to_numpy(); T = len(y); L = MAX_LAG
    names = [c for c in D.columns if c not in ("month", "operating_margin_pct")]
    y1, ylag = y[L:], y[L - 1:T - 1]
    rss0 = ols_rss(ylag[:, None], y1)
    rows = []
    for n in names:
        x = D[n].to_numpy()
        corr = [np.corrcoef(x[L - l:T - l], y[L:])[0, 1] for l in range(L + 1)]
        lag = int(np.argmax(np.abs(corr)))
        rss1 = ols_rss(np.column_stack([ylag, x[L - lag:T - lag]]), y1)
        F = (rss0 - rss1) / (rss1 / (len(y1) - 3)); p = 1 - stats.f.cdf(F, 1, len(y1) - 3)
        rows.append({"kpi": n, "function": cat[n], "lead_months": lag, "correlation": round(corr[lag], 2), "f_score": round(F, 1), "p_value": round(p, 4)})
    R = pd.DataFrame(rows).sort_values("f_score", ascending=False).reset_index(drop=True)
    kept, dropped = [], []
    for r in R.itertuples():
        dup = next((k for k in kept if abs(np.corrcoef(D[k], D[r.kpi])[0, 1]) > 0.85), None)
        (dropped.append({"kpi": r.kpi, "tracks": dup}) if dup else kept.append(r.kpi))
    pv = R.set_index("kpi").p_value
    significant = [k for k in kept if pv[k] < 0.01]
    drivers = (significant if len(significant) >= 3 else kept[:3])[:n_drivers]; lag_of = R.set_index("kpi").lead_months
    X = np.column_stack([D[d].to_numpy()[L - lag_of[d]:T - lag_of[d]] for d in drivers])
    mdl = LinearRegression().fit(X, y1); r2 = mdl.score(X, y1)
    now, prev = y[-3:].mean(), y[-6:-3].mean()
    contrib = []
    for j, d in enumerate(drivers):
        x = D[d].to_numpy(); l = lag_of[d]
        chg = x[T - 3 - l:T - l].mean() - x[T - 6 - l:T - 3 - l].mean()
        contrib.append({"driver": d, "function": cat[d], "lead_months": int(l), "effect_per_unit": round(mdl.coef_[j], 3), "last_quarter_change": round(chg, 2), "margin_impact_pts": round(mdl.coef_[j] * chg, 2)})
    C = pd.DataFrame(contrib); other = (now - prev) - C.margin_impact_pts.sum()
    wf = pd.concat([C[["driver", "margin_impact_pts"]], pd.DataFrame([{"driver": "Other / unexplained", "margin_impact_pts": round(other, 2)}])]).sort_values("margin_impact_pts")
    anom = []
    for n in names:
        w = D[n].to_numpy()[T - 13:T - 1]; z = (D[n].iloc[-1] - w.mean()) / (w.std() or 1)
        if abs(z) > 2.2: anom.append({"kpi": n, "function": cat[n], "latest": round(D[n].iloc[-1], 2), "z_score": round(z, 1)})
    A = pd.DataFrame(anom, columns=["kpi", "function", "latest", "z_score"])
    noise = R[(R.f_score < 1.5) & (~R.kpi.isin(drivers))]
    neg = C[C.margin_impact_pts < 0].sort_values("margin_impact_pts")
    return {
        "steps": [f"{len(names)} KPIs x {T} months", f"Strongest lead: {R.loc[R.correlation.abs().idxmax(), 'kpi']} (r {R.correlation.abs().max():.2f})",
                  f"{int((R.p_value < 0.01).sum())} KPIs significant at p < 0.01", f"{len(dropped)} duplicates removed", f"R² {r2:.2f} with {len(drivers)} drivers",
                  f"Margin {now - prev:+.2f} pts vs prior quarter", f"{len(A)} KPIs outside their normal range", "Ready"],
        "kpis": [kpi("KPIs reviewed", str(len(names)), f"From {cat.nunique()} functions"), kpi("Real drivers", str(len(drivers)), f"Explain {pct(r2, 0)} of margin moves"),
                 kpi("Operating margin", f"{now:.1f}%", f"{now - prev:+.2f} pts vs prior quarter"), kpi("Safe to drop", str(len(noise) + len(dropped)), "No signal or duplicate")],
        "charts": [line("Operating margin", D, "month", "operating_margin_pct"), bar("Which KPIs lead margin (Granger-style F score, top 12)", R.head(12), "kpi", "f_score"),
                   bar("What moved margin last quarter (pts)", wf, "driver", "margin_impact_pts")],
        "tables": [table("Driver model", C), table("Lead-lag scan of all KPIs", R), table("Anomalies this month", A),
                   table("KPIs safe to drop", pd.concat([noise[["kpi", "function"]].assign(reason="No signal"), pd.DataFrame(dropped).assign(reason=lambda d: "Duplicates " + d.tracks).drop(columns="tracks") if dropped else pd.DataFrame(columns=["kpi", "reason"])]))],
        "recs": [rec(f"{r.driver} cost {abs(r.margin_impact_pts):.2f} pts of margin", f"It moved {r.last_quarter_change:+.2f} vs the prior quarter. Ask the {r.function} leader for a recovery plan with a monthly target.", f"{r.margin_impact_pts:.2f} pts") for r in neg.head(3).itertuples()]
                + [rec(f"Rebuild the executive dashboard around {len(drivers)} drivers", f"{', '.join(drivers)} explain {pct(r2, 0)} of monthly margin moves. Show each with its lead time.", f"{len(names)} -> {len(drivers)} KPIs"),
                   rec(f"Retire or demote {len(noise) + len(dropped)} KPIs", "They add no signal about margin. Move them to function-level reports.", "Less noise")],
    }


if __name__ == "__main__":
    from src.data_generator import load_or_generate
    from src.report import write_reports

    out = run(load_or_generate(), **{p["name"]: p["default"] for p in PARAMS})
    for k in out["kpis"]:
        print(f"{k['label']}: {k['value']}  {k['note']}")
    print("Reports written to", write_reports(out, META, Path(__file__).resolve().parent.parent / "reports"))
