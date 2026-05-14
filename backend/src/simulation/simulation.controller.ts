import { Body, Controller, Post } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { RunSimulationDto } from './dto/run-simulation.dto';

@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('run')
  run(@Body() dto: RunSimulationDto) {
    return this.simulationService.runSimulation(dto);
  }
}
