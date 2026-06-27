import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TimeIntegrityService {
  private readonly thresholdMs: number;

  constructor(configService: ConfigService) {
    this.thresholdMs = configService.get<number>('app.timeSpoofingThresholdMs') ?? 300_000;
  }

  /**
   * Compares device capture time against server receipt time.
   * Returns true when delta exceeds threshold (potential time spoofing).
   */
  detectTimeSpoofing(deviceTimestamp: Date, serverTime = new Date()): boolean {
    const delta = Math.abs(serverTime.getTime() - deviceTimestamp.getTime());
    return delta > this.thresholdMs;
  }

  assertCaptureTimestamp(captureTimestamp: Date): void {
    const now = Date.now();
    const captureMs = captureTimestamp.getTime();

    if (Number.isNaN(captureMs)) {
      throw new BadRequestException('Invalid capture_timestamp');
    }

    // Reject future captures (> 2 min clock skew tolerance)
    if (captureMs > now + 120_000) {
      throw new BadRequestException(
        'capture_timestamp cannot be in the future — gallery uploads are not permitted',
      );
    }

    // Reject captures older than 24h (live camera only policy)
    if (captureMs < now - 86_400_000) {
      throw new BadRequestException(
        'capture_timestamp is too old — only live camera captures are accepted',
      );
    }
  }

  compareForLastWriteWins(
    incoming: Date,
    existing: Date,
  ): 'incoming_wins' | 'existing_wins' | 'tie_incoming_wins' {
    const incomingMs = incoming.getTime();
    const existingMs = existing.getTime();

    if (incomingMs > existingMs) return 'incoming_wins';
    if (incomingMs < existingMs) return 'existing_wins';
    return 'tie_incoming_wins';
  }
}
