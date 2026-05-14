import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MortalityModule } from './mortality/mortality.module';
import { PremiumModule } from './premium/premium.module';
import { SimulationModule } from './simulation/simulation.module';

@Module({
  imports: [MortalityModule, PremiumModule, SimulationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
