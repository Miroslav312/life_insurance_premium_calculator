import { Test, TestingModule } from '@nestjs/testing';
import { PremiumService } from './premium.service';
import { MortalityService } from '../mortality/mortality.service';

describe('PremiumService', () => {
  let service: PremiumService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PremiumService, MortalityService],
    }).compile();

    service = module.get<PremiumService>(PremiumService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
