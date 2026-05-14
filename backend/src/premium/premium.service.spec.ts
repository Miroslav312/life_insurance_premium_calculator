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
});
