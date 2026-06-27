import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class BarcodeService {
  /**
   * System-generated LTR reference — no manual entry.
   * Format: LTR-{6 hex} (e.g. LTR-A3F2B1)
   */
  generate(): string {
    const shortId = randomBytes(3).toString('hex').toUpperCase();
    return `LTR-${shortId}`;
  }

  normalize(input: string): string {
    return input.trim().toUpperCase();
  }
}
