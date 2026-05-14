import {
  Injectable,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

export interface MortalityRow {
  age: number;
  qx: number;
  lx: number;
  dx: number;
  ex: number;
}

@Injectable()
export class MortalityService implements OnModuleInit {
  private table: MortalityRow[] = [];

  async onModuleInit() {
    await this.loadTable();
  }

  private loadTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const candidateFiles = [
        'american-life-table.csv',
      ];
      const dataDir = path.resolve(__dirname, '..', '..', '..', 'data');
      const csvPath = candidateFiles
        .map((file) => path.join(dataDir, file))
        .find((filePath) => fs.existsSync(filePath));

      if (!csvPath) {
        return reject(
          new Error(
            `Mortality data file not found. Expected one of: ${candidateFiles
              .map((f) => `data/${f}`)
              .join(', ')}`,
          ),
        );
      }

      const rows: MortalityRow[] = [];

      fs.createReadStream(csvPath)
        .pipe(
          csvParser({
            mapHeaders: ({ header }) => header.trim().toLowerCase(),
            mapValues: ({ value }) =>
              typeof value === 'string' ? value.trim() : value,
          }),
        )
        .on('data', (row: Record<string, string>) => {
          // Support both the actuarial schema (qx, lx, ex) and the
          // SSA schema (male_death_probability, male_number_of_lives, ...).
          const qxRaw = row.qx ?? row.male_death_probability;
          const lxRaw = row.lx ?? row.male_number_of_lives;
          const exRaw = row.ex ?? row.male_life_expectancy ?? '0';
          rows.push({
            age: parseInt(row.age, 10),
            qx: parseFloat(qxRaw),
            lx: parseFloat(lxRaw),
            dx: parseFloat(row.dx ?? '0'),
            ex: parseFloat(exRaw),
          });
        })
        .on('end', () => {
          this.table = rows
            .filter((r) => Number.isFinite(r.age))
            .sort((a, b) => a.age - b.age);
          // Backfill dx from lx differences when not provided in the CSV.
          for (let i = 0; i < this.table.length - 1; i++) {
            if (!Number.isFinite(this.table[i].dx) || this.table[i].dx === 0) {
              this.table[i].dx = this.table[i].lx - this.table[i + 1].lx;
            }
          }
          resolve();
        })
        .on('error', reject);
    });
  }

  getFullTable(): MortalityRow[] {
    return this.table;
  }

  getRow(age: number): MortalityRow | undefined {
    return this.table.find((r) => r.age === age);
  }

  getQx(age: number): number {
    const row = this.getRow(age);
    if (!row) {
      throw new UnprocessableEntityException(
        `Age ${age} is outside the mortality table range (0–${this.getMaxAge()})`,
      );
    }
    return row.qx;
  }

  getLx(age: number): number {
    const row = this.getRow(age);
    if (!row) {
      throw new UnprocessableEntityException(
        `Age ${age} is outside the mortality table range (0–${this.getMaxAge()})`,
      );
    }
    return row.lx;
  }

  getMaxAge(): number {
    return this.table[this.table.length - 1]?.age ?? 0;
  }
}