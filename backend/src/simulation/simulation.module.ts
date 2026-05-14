import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';

@Module({
  imports: [HttpModule],
  providers: [SimulationService],
  controllers: [SimulationController],
})
export class SimulationModule {}
