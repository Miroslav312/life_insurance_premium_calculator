import numpy as np

from simulation import simulate_policy_outcomes


def test_simulation_returns_expected_keys():
    result = simulate_policy_outcomes(
        age=30, term=20, sum_assured=100000, interest_rate=0.05, n_simulations=1000
    )
    assert "meanPayout" in result
    assert "histogram" in result
    assert result["proportionClaimed"] > 0
    assert result["proportionClaimed"] < 1


def test_older_age_has_higher_payout():
    young = simulate_policy_outcomes(
        age=25, term=20, sum_assured=100000, interest_rate=0.05, n_simulations=5000
    )
    old = simulate_policy_outcomes(
        age=55, term=20, sum_assured=100000, interest_rate=0.05, n_simulations=5000
    )
    assert old["meanPayout"] > young["meanPayout"]


def test_mc_mean_converges_to_analytical_ax_times_sum_assured():
    """The MC mean payout should match Ax * sum_assured within sampling noise."""
    from simulation import analytical_ax

    np.random.seed(42)
    age, term, sa, i = 30, 20, 100_000, 0.05
    n = 50_000

    result = simulate_policy_outcomes(age, term, sa, i, n_simulations=n)
    expected = analytical_ax(age, term, i) * sa

    rel_error = abs(result["meanPayout"] - expected) / expected
    assert rel_error < 0.05, (
        f"MC mean {result['meanPayout']} diverged from analytical {expected:.2f} "
        f"by {rel_error*100:.2f}%"
    )
