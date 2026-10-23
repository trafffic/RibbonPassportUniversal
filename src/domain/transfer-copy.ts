import type { TransferCheck } from './rules';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const roman = (gen?: number) => ROMAN[gen ?? 0] || '?';

/** Headline for the transfer check, shared by the status row and the sheet. */
export function transferTitle(t: TransferCheck): string {
  if (!t.canAssess) return "Choose this Pokémon's current game";
  if (!t.nextGeneration) return 'Latest generation reached';
  if (t.lastChance.length)
    return `Not safe to leave Gen ${roman(t.generation)}`;
  if (t.warnings.length)
    return `Check Footprint Ribbon before leaving Gen ${roman(t.generation)}`;
  return 'Ready to move up';
}

/** One-line detail under the headline. */
export function transferSummary(t: TransferCheck): string {
  if (!t.canAssess)
    return 'Set its current game to see which ribbons can still be earned.';
  if (t.lastChance.length)
    return `${t.lastChance.length} last-chance ${t.lastChance.length === 1 ? 'ribbon' : 'ribbons'} to earn first`;
  if (t.warnings.length) return t.warnings[0] ?? '';
  if (!t.nextGeneration)
    return 'Nothing to transfer to yet. Every remaining ribbon can still be earned here.';
  return 'No last-chance ribbons left';
}

/** "Gen IX → Gen X", or just "Gen IX" when there is no later generation. */
export function generationLabel(t: TransferCheck): string {
  if (!t.generation) return '';
  return t.nextGeneration
    ? `Gen ${roman(t.generation)} → Gen ${roman(t.nextGeneration)}`
    : `Gen ${roman(t.generation)}`;
}
