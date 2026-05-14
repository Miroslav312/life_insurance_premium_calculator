
import { Controller, Get } from '@nestjs/common';
import { MortalityService } from './mortality.service';

@Controller('mortality')
export class MortalityController {
  constructor(private readonly mortalityService: MortalityService) {}

  @Get('curve')
  getCurve() {
    return {
      data: this.mortalityService.getFullTable().map(({ age, qx, lx }) => ({
        age,
        qx,
        lx,
      })),
    };
  }
}