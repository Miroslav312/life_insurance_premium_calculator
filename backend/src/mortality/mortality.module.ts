import { Module } from '@nestjs/common';
import { MortalityService } from './mortality.service';
import { MortalityController } from './mortality.controller';

@Module({
  providers: [MortalityService],
  controllers: [MortalityController],
  exports: [MortalityService],        // ← important
})
export class MortalityModule {}