
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export interface PremiumRequest {
  age: number;
  term: number;
  sumAssured: number;
  interestRate: number;
}

export interface PremiumResponse {
  netAnnualPremium: number;
  ax: number;
  annuityDue: number;
  inputs: PremiumRequest;
}

export interface SensitivityRequest {
  age: number;
  term: number;
  sumAssured: number;
  interestRateMin: number;
  interestRateMax: number;
  interestRateStep: number;
}

export interface SensitivityDataPoint {
  interestRate: number;
  netAnnualPremium: number;
}

export interface MortalityCurvePoint {
  age: number;
  qx: number;
  lx: number;
}

export interface SimulationRequest {
  age: number;
  term: number;
  sumAssured: number;
  interestRate: number;
  numSimulations?: number;
}

export interface HistogramBucket {
  bucketMin: number;
  bucketMax: number;
  count: number;
}

export interface SimulationResponse {
  meanPayout: number;
  medianPayout: number;
  percentile5: number;
  percentile95: number;
  proportionClaimed: number;
  histogram: HistogramBucket[];
}

export const calculatePremium = (data: PremiumRequest) =>
  api.post<PremiumResponse>('/premium/calculate', data);

export const getSensitivity = (data: SensitivityRequest) =>
  api.post<{ dataPoints: SensitivityDataPoint[] }>('/premium/sensitivity', data);

export const getMortalityCurve = () =>
  api.get<{ data: MortalityCurvePoint[] }>('/mortality/curve');

export const runSimulation = (data: SimulationRequest) =>
  api.post<SimulationResponse>('/simulation/run', data);