import { Module } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { MortalityModule } from '../mortality/mortality.module';

@Module({
  imports: [MortalityModule],   // ← import so we can inject MortalityService
  providers: [PremiumService],
  controllers: [PremiumController],
})
export class PremiumModule {}
