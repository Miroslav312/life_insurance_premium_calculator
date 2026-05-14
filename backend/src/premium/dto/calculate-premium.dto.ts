import { IsInt, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

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
  @Min(0.001)
  @Max(0.20)
  interestRate!: number;

  @IsBoolean()
  @IsOptional()
  smoker?: boolean;
}
