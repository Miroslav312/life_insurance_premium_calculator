import { Test, TestingModule } from '@nestjs/testing';
import { MortalityService } from './mortality.service';

describe('MortalityService', () => {
  let service: MortalityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MortalityService],
    }).compile();

    service = module.get<MortalityService>(MortalityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
