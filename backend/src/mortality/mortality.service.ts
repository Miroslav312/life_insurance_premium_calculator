import { Injectable, OnModuleInit } from '@nestjs/common';
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
      const csvPath = path.resolve(__dirname, '..', '..', '..', 'data', 'life-table.csv');
      const rows: MortalityRow[] = [];

      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row: Record<string, string>) => {
          rows.push({
            age: parseInt(row.age, 10),
            qx: parseFloat(row.qx),
            lx: parseFloat(row.lx),
            dx: parseFloat(row.dx || '0'),
            ex: parseFloat(row.ex || '0'),
          });
        })
        .on('end', () => {
          this.table = rows.sort((a, b) => a.age - b.age);
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
    if (!row) throw new Error(`No mortality data for age ${age}`);
    return row.qx;
  }

  getLx(age: number): number {
    const row = this.getRow(age);
    if (!row) throw new Error(`No mortality data for age ${age}`);
    return row.lx;
  }

  getMaxAge(): number {
    return this.table[this.table.length - 1]?.age ?? 0;
  }
}