import { Injectable } from '@nestjs/common';
import { MortalityService } from '../mortality/mortality.service';

@Injectable()
export class PremiumService {
  constructor(private readonly mortality: MortalityService) {}

  /**
   * Calculate Ax — present value of a £1 death benefit
   * for a term life policy on a life aged x, for n years.
   *
   * Formula: Ax = Σ (t=0 to n-1) v^(t+1) * tPx * q(x+t)
   *
   * where:
   *   v = 1 / (1 + i)             discount factor
   *   tPx = l(x+t) / l(x)        probability of surviving t years
   *   q(x+t) = mortality rate at age x+t
   */
  calculateAx(age: number, term: number, interestRate: number): number {
    const v = 1 / (1 + interestRate);
    const lx = this.mortality.getLx(age);
    let ax = 0;

    for (let t = 0; t < term; t++) {
      const tPx = this.mortality.getLx(age + t) / lx; // survival probability
      const qxt = this.mortality.getQx(age + t);       // mortality rate
      ax += Math.pow(v, t + 1) * tPx * qxt;
    }

    return ax;
  }

  /**
   * Calculate äx — present value of an annuity-due of £1/year
   * for n years on a life aged x.
   *
   * Formula: äx = Σ (t=0 to n-1) v^t * tPx
   */
  calculateAnnuityDue(age: number, term: number, interestRate: number): number {
    const v = 1 / (1 + interestRate);
    const lx = this.mortality.getLx(age);
    let annuity = 0;

    for (let t = 0; t < term; t++) {
      const tPx = this.mortality.getLx(age + t) / lx;
      annuity += Math.pow(v, t) * tPx;
    }

    return annuity;
  }

  /**
   * Calculate the net level annual premium.
   *
   * Premium = (Ax / äx) × Sum Assured
   */
  calculateNetPremium(
    age: number,
    term: number,
    sumAssured: number,
    interestRate: number,
  ): { netAnnualPremium: number; ax: number; annuityDue: number } {
    const ax = this.calculateAx(age, term, interestRate);
    const annuityDue = this.calculateAnnuityDue(age, term, interestRate);
    const netAnnualPremium = (ax / annuityDue) * sumAssured;

    return {
      netAnnualPremium: Math.round(netAnnualPremium * 100) / 100,
      ax: Math.round(ax * 100000) / 100000,
      annuityDue: Math.round(annuityDue * 100000) / 100000,
    };
  }
}
