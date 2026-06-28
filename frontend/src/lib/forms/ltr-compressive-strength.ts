export function calculateCompressiveStrengthMpa(
  failureLoadKn: number,
  specimenType: string,
): number | null {
  if (!failureLoadKn || failureLoadKn <= 0) return null;

  let areaMm2 = 22_500;
  if (specimenType === 'CYLINDER_150x300') {
    areaMm2 = Math.PI * 75 * 75;
  }

  return Math.round((failureLoadKn * 1000) / areaMm2 * 100) / 100;
}
