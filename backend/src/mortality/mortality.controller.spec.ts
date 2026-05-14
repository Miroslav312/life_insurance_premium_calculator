import { Test, TestingModule } from '@nestjs/testing';
import { MortalityController } from './mortality.controller';
import { MortalityService } from './mortality.service';

describe('MortalityController', () => {
  let controller: MortalityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MortalityController],
      providers: [MortalityService],
    }).compile();

    controller = module.get<MortalityController>(MortalityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
