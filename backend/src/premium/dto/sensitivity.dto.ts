import { IsInt, IsNumber, Min, Max } from 'class-validator';

export class SensitivityDto {
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
  @Min(0.001)
  @Max(0.20)
  interestRateMin!: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.20)
  interestRateMax!: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.05)
  interestRateStep!: number;
}
