import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SimulationService } from './simulation.service';
import { RunSimulationDto } from './dto/run-simulation.dto';

describe('SimulationService', () => {
  let service: SimulationService;
  let http: { post: jest.Mock };

  const dto: RunSimulationDto = {
    age: 30,
    term: 20,
    sumAssured: 100000,
    interestRate: 0.05,
  };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: HttpService, useValue: http },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('resolves to the response data on success', async () => {
    http.post.mockReturnValue(of({ data: { meanPayout: 100 } }));
    await expect(service.runSimulation(dto)).resolves.toEqual({
      meanPayout: 100,
    });
  });

  it('throws HttpException with status 503 when the http call fails', async () => {
    http.post.mockReturnValue(
      throwError(() => new Error('connection refused')),
    );
    await expect(service.runSimulation(dto)).rejects.toBeInstanceOf(
      HttpException,
    );
    await expect(service.runSimulation(dto)).rejects.toMatchObject({
      status: 503,
    });
  });
});
