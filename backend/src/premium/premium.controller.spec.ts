import { Test, TestingModule } from '@nestjs/testing';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { MortalityService } from '../mortality/mortality.service';

describe('PremiumController', () => {
  let controller: PremiumController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PremiumController],
      providers: [PremiumService, MortalityService],
    }).compile();

    controller = module.get<PremiumController>(PremiumController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
