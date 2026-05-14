import { Test, TestingModule } from '@nestjs/testing';
import { MortalityService } from './mortality.service';

describe('MortalityService', () => {
  let service: MortalityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MortalityService],
    }).compile();

    service = module.get<MortalityService>(MortalityService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('loads more than 100 rows from the mortality table', () => {
    expect(service.getFullTable().length).toBeGreaterThan(100);
  });

  it('returns a finite qx between 0 and 1 for age 30', () => {
    const qx = service.getQx(30);
    expect(Number.isFinite(qx)).toBe(true);
    expect(qx).toBeGreaterThanOrEqual(0);
    expect(qx).toBeLessThanOrEqual(1);
  });

  it('has more survivors at age 0 than at age 80', () => {
    expect(service.getLx(0)).toBeGreaterThan(service.getLx(80));
  });
});
