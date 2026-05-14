import { UnprocessableEntityException } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { MortalityService } from '../mortality/mortality.service';

describe('PremiumService', () => {
  let premiumService: PremiumService;

  beforeAll(async () => {
    const mortalityService = new MortalityService();
    await mortalityService.onModuleInit();
    premiumService = new PremiumService(mortalityService);
  });

  it('should calculate a positive net premium', () => {
    const result = premiumService.calculateNetPremium(30, 20, 100000, 0.05);
    expect(result.netAnnualPremium).toBeGreaterThan(0);
    expect(result.netAnnualPremium).toBeLessThan(10000);
  });

  it('should return higher premium for older age', () => {
    const young = premiumService.calculateNetPremium(25, 20, 100000, 0.05);
    const old = premiumService.calculateNetPremium(50, 20, 100000, 0.05);
    expect(old.netAnnualPremium).toBeGreaterThan(young.netAnnualPremium);
  });

  it('should return lower premium for higher interest rate', () => {
    const lowRate = premiumService.calculateNetPremium(30, 20, 100000, 0.02);
    const highRate = premiumService.calculateNetPremium(30, 20, 100000, 0.08);
    expect(highRate.netAnnualPremium).toBeLessThan(lowRate.netAnnualPremium);
  });

  it('matches a hand-calculated value on a synthetic mortality table', () => {
    const stub = {
      getLx: (age: number) => {
        const table: Record<number, number> = { 30: 100000, 31: 99000, 32: 97020 };
        return table[age];
      },
      getQx: (age: number) => {
        const table: Record<number, number> = { 30: 0.01, 31: 0.02 };
        return table[age];
      },
    } as unknown as MortalityService;

    const service = new PremiumService(stub);
    const result = service.calculateNetPremium(30, 2, 100000, 0.05);

    expect(result.ax).toBeCloseTo(0.02748, 4);
    expect(result.annuityDue).toBeCloseTo(1.94286, 4);
    expect(result.netAnnualPremium).toBeCloseTo(1414.57, 1);
  });

  it('should throw UnprocessableEntityException when age+term exceeds the mortality table', () => {
    expect(() =>
      premiumService.calculateNetPremium(95, 30, 100000, 0.05),
    ).toThrow(UnprocessableEntityException);
  });
});
