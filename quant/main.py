from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from simulation import simulate_policy_outcomes

app = FastAPI(title="Actuarial Monte Carlo Simulation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulationRequest(BaseModel):
    age: int = Field(ge=0, le=100)
    term: int = Field(ge=1, le=50)
    sum_assured: float = Field(ge=1000, alias="sumAssured")
    interest_rate: float = Field(ge=0.001, le=0.20, alias="interestRate")
    num_simulations: int = Field(
        default=10000, ge=100, le=100000, alias="numSimulations"
    )


@app.post("/simulate")
def run_simulation(req: SimulationRequest):
    return simulate_policy_outcomes(
        age=req.age,
        term=req.term,
        sum_assured=req.sum_assured,
        interest_rate=req.interest_rate,
        n_simulations=req.num_simulations,
    )
