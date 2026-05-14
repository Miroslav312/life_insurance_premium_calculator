import { IsInt, IsNumber, Min, Max } from 'class-validator';
import { INTEREST_RATE_MAX, INTEREST_RATE_MIN } from '../../common/validation.constants';

export class CalculatePremiumDto {
  @IsInt()
  @Min(0)
  @Max(100)
  age!: number;

  @IsInt()
  @Min(1)
  @Max(50)
  term!: number;

  @IsNumber()
  @Min(1000)
  sumAssured!: number;

  @IsNumber()
  @Min(INTEREST_RATE_MIN)
  @Max(INTEREST_RATE_MAX)
  interestRate!: number;
}
