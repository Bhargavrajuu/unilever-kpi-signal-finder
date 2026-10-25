"""Sample data for Unilever: 36 monthly KPIs from 6 functions and operating margin over 48 months."""
from pathlib import Path

import numpy as np
import pandas as pd


def generate(seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    T = 48

    def walk(s, rho=0.3):
        v, out = 0.0, []
        for _ in range(T):
            v = rho * v + rng.normal(0, s); out.append(v)
        return np.array(out)

    drv = lambda s: walk(s, 0.85)
    t = np.arange(T)
    price, commod = drv(0.6), drv(0.8) + np.where(t > 40, 1.6 * (t - 40) / 4, 0)
    promo, osa = drv(0.5) + np.where(t > 42, 0.9, 0), drv(0.5) - np.where(t > 41, 1.2, 0)
    fa, brand = drv(0.6), drv(0.4)
    lag = lambda a, l: np.concatenate([np.repeat(a[0], l), a[: T - l]]) if l else a
    margin = 16 + 1.1 * price - 1.0 * lag(commod, 1) - 0.9 * promo + 0.8 * lag(osa, 1) + 0.6 * lag(fa, 2) + 0.5 * lag(brand, 3) + rng.normal(0, 0.3, T)
    kpis = [("Sales", "Price realisation %", price, 2.0), ("Sales", "Promo depth %", promo * 0.9 + rng.normal(0, 0.15, T), 18), ("Sales", "Trade promo spend % of sales", promo, 14),
            ("Sales", "Distribution points", walk(0.5), 82), ("Sales", "Order fill rate", 0.7 * osa + rng.normal(0, 0.4, T), 95), ("Sales", "Key account growth", walk(0.7), 4),
            ("Sales", "E-commerce share", walk(0.4), 17), ("Sales", "Volume growth", walk(0.6), 2), ("Marketing", "Brand power score", brand, 60),
            ("Marketing", "Share of voice", 0.6 * brand + rng.normal(0, 0.4, T), 30), ("Marketing", "A&P spend % of sales", walk(0.5), 13), ("Marketing", "Social sentiment", walk(0.6), 70),
            ("Marketing", "Penetration %", walk(0.4), 45), ("Marketing", "Innovation share of sales", walk(0.5), 12), ("Supply chain", "On-shelf availability %", osa, 92),
            ("Supply chain", "Forecast accuracy %", fa, 78), ("Supply chain", "Commodity cost index", commod, 100), ("Supply chain", "Freight cost per case", 0.5 * commod + rng.normal(0, 0.6, T), 1.4),
            ("Supply chain", "Inventory days", walk(0.6), 38), ("Supply chain", "OTIF %", 0.6 * osa + rng.normal(0, 0.5, T), 90), ("Supply chain", "Factory OEE %", walk(0.5), 74),
            ("Supply chain", "Waste %", walk(0.4), 2.5), ("HR", "Headcount", walk(0.5), 12000), ("HR", "Attrition %", walk(0.5), 9), ("HR", "Engagement score", walk(0.4), 74),
            ("HR", "Training hrs per FTE", walk(0.6), 22), ("HR", "Overtime %", walk(0.5), 6), ("Finance", "DSO days", walk(0.5), 32), ("Finance", "Capex % of sales", walk(0.4), 3.2),
            ("Finance", "FX index", walk(0.7), 100), ("Finance", "Working capital % of sales", walk(0.5), -2), ("Finance", "Overheads % of sales", walk(0.4), 11),
            ("Customer", "Complaints per million", walk(0.6), 18), ("Customer", "NPS", walk(0.6), 34), ("Customer", "Returns %", walk(0.4), 1.2), ("Customer", "Customer service level", 0.5 * osa + rng.normal(0, 0.6, T), 96)]
    months = pd.period_range("2022-10", periods=T, freq="M").astype(str)
    df = pd.DataFrame({"month": months, "operating_margin_pct": margin.round(3)})
    for _, name, s, base in kpis:
        df[name] = (base + s * max(0.2, abs(base) * 0.02)).round(3)
    catalog = pd.DataFrame([{"kpi": n, "function": f} for f, n, _, _ in kpis])
    return {"monthly_kpis": df, "kpi_catalog": catalog}


# ---------------------------------------------------------------------------
# Save and load helpers
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def save(data: dict, folder: Path = DATA_DIR) -> None:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for name, df in data.items():
        df.to_csv(folder / f"{name}.csv", index=False)


def load_or_generate(folder: Path = DATA_DIR, seed: int = 42) -> dict:
    """Read the CSVs in data/ if they exist, otherwise generate fresh sample data."""
    folder = Path(folder)
    names = list(generate(seed).keys())
    if all((folder / f"{n}.csv").exists() for n in names):
        return {n: pd.read_csv(folder / f"{n}.csv") for n in names}
    return generate(seed)


if __name__ == "__main__":
    d = generate(42)
    save(d)
    for n, df in d.items():
        print(f"data/{n}.csv  {len(df):,} rows x {df.shape[1]} columns")
