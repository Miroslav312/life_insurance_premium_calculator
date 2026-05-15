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
    df["male_death_probability"] = (
        df["male_death_probability"].astype(str).str.strip().astype(float)
    )
    df["age"] = df["age"].astype(str).str.strip().astype(int)
    qx_lookup = dict(zip(df["age"], df["male_death_probability"]))

    qx = np.array([qx_lookup.get(age + t, 1.0) for t in range(term)])

    draws = np.random.random((n_simulations, term))
    deaths = draws < qx

    any_death = deaths.any(axis=1)
    first_death_year = np.argmax(deaths, axis=1)

    discount = (1 / (1 + interest_rate)) ** (first_death_year + 1)
    payouts = np.where(any_death, sum_assured * discount, 0.0)

    return {
        "meanPayout": round(float(np.mean(payouts)), 2),
        "medianPayout": round(float(np.median(payouts)), 2),
        "percentile5": round(float(np.percentile(payouts, 5)), 2),
        "percentile95": round(float(np.percentile(payouts, 95)), 2),
        "proportionClaimed": round(float(np.count_nonzero(payouts) / n_simulations), 4),
        "histogram": _build_histogram(payouts),
    }


def analytical_ax(
    age: int,
    term: int,
    interest_rate: float,
) -> float:
    """Ax — present value of a 1-unit death benefit. Same formula as the TS service."""
    df = load_american_life_table()
    df["male_death_probability"] = (
        df["male_death_probability"].astype(str).str.strip().astype(float)
    )
    df["male_number_of_lives"] = (
        df["male_number_of_lives"].astype(str).str.strip().astype(float)
    )
    df["age"] = df["age"].astype(str).str.strip().astype(int)
    qx = dict(zip(df["age"], df["male_death_probability"]))
    lx = dict(zip(df["age"], df["male_number_of_lives"]))

    v = 1 / (1 + interest_rate)
    l_base = lx[age]
    ax = 0.0
    for t in range(term):
        t_p_x = lx[age + t] / l_base
        ax += v ** (t + 1) * t_p_x * qx[age + t]
    return ax


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
