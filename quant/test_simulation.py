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
