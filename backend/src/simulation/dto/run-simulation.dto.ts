import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class RunSimulationDto {
  @IsInt()
  @Min(0)
  @Max(100)
  age: number;

  @IsInt()
  @Min(1)
  @Max(50)
  term: number;

  @IsNumber()
  @Min(1000)
  sumAssured: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.2)
  interestRate: number;

  @IsInt()
  @Min(100)
  @Max(100000)
  @IsOptional()
  numSimulations?: number;
}
