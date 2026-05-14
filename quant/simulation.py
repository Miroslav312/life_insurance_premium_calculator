from pathlib import Path
import pandas as pd
import numpy as np

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "american-life-table.csv"


def load_american_life_table():
    df = pd.read_csv(DATA_PATH)
    # Strip leading/trailing spaces from column names
    df.columns = df.columns.str.strip()
    return df


def simulate_policy_outcomes(
    age: int,
    term: int,
    sum_assured: float,
    interest_rate: float,
    n_simulations: int = 10000,
) -> dict:
    df = load_american_life_table()
    # Clean up probability column: strip whitespace and convert to float
    df["male_death_probability"] = (
        df["male_death_probability"].astype(str).str.strip().astype(float)
    )
    df["age"] = df["age"].astype(str).str.strip().astype(int)
    qx_lookup = dict(zip(df["age"], df["male_death_probability"]))

    payouts = np.zeros(n_simulations)

    for i in range(n_simulations):
        for t in range(term):
            current_age = age + t
            qx = qx_lookup.get(current_age, 1.0)
            if np.random.random() < qx:
                # Policyholder dies: compute present value of payout
                discount = (1 / (1 + interest_rate)) ** (t + 1)
                payouts[i] = sum_assured * discount
                break

    return {
        "meanPayout": round(float(np.mean(payouts)), 2),
        "medianPayout": round(float(np.median(payouts)), 2),
        "percentile5": round(float(np.percentile(payouts, 5)), 2),
        "percentile95": round(float(np.percentile(payouts, 95)), 2),
        "proportionClaimed": round(float(np.count_nonzero(payouts) / n_simulations), 4),
        "histogram": _build_histogram(payouts),
    }


def _build_histogram(payouts: np.ndarray, bins: int = 20) -> list[dict]:
    counts, edges = np.histogram(payouts, bins=bins)
    return [
        {
            "bucketMin": round(float(edges[i]), 2),
            "bucketMax": round(float(edges[i + 1]), 2),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]
