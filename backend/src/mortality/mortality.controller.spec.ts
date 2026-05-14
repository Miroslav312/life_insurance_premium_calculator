import { Test, TestingModule } from '@nestjs/testing';
import { MortalityController } from './mortality.controller';

describe('MortalityController', () => {
  let controller: MortalityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MortalityController],
    }).compile();

    controller = module.get<MortalityController>(MortalityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
