import { HttpException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RunSimulationDto } from './dto/run-simulation.dto';

@Injectable()
export class SimulationService {
  private readonly url =
    process.env.SIMULATION_SERVICE_URL ?? 'http://localhost:8000';

  constructor(private readonly http: HttpService) {}

  async runSimulation(dto: RunSimulationDto) {
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.url}/simulate`, dto),
      );
      return response.data;
    } catch {
      throw new HttpException('Simulation service unavailable', 503);
    }
  }
}
