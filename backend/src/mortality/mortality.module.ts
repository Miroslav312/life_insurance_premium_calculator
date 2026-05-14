import { Module } from '@nestjs/common';
import { MortalityService } from './mortality.service';
import { MortalityController } from './mortality.controller';

@Module({
  providers: [MortalityService],
  controllers: [MortalityController]
})
export class MortalityModule {}
