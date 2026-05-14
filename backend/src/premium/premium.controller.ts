import { Controller, Post, Body } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { CalculatePremiumDto } from './dto/calculate-premium.dto';
import { SensitivityDto } from './dto/sensitivity.dto';

@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculatePremiumDto) {
    const result = this.premiumService.calculateNetPremium(
      dto.age,
      dto.term,
      dto.sumAssured,
      dto.interestRate,
    );
    return { ...result, inputs: dto };
  }

  @Post('sensitivity')
  sensitivity(@Body() dto: SensitivityDto) {
    const dataPoints: Array<{ interestRate: number; netAnnualPremium: number }> = [];
    const steps = Math.round(
      (dto.interestRateMax - dto.interestRateMin) / dto.interestRateStep,
    );
    for (let i = 0; i <= steps; i++) {
      const rate =
        Math.round(
          (dto.interestRateMin + i * dto.interestRateStep) * 10000,
        ) / 10000;
      const { netAnnualPremium } = this.premiumService.calculateNetPremium(
        dto.age,
        dto.term,
        dto.sumAssured,
        rate,
      );
      dataPoints.push({ interestRate: rate, netAnnualPremium });
    }
    return { dataPoints };
  }
}
