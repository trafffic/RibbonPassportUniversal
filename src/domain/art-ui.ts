import artColours from '../../assets/data/art-colours.json';
import catalogData from '../../assets/data/catalog.json';

/** Lower-case ASCII letters and digits only, as the iPhone app's catalogue key. */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const itemKey = (item: string) => 'item-' + normaliseName(item);

/** Origin console art key ("console-gba") for a game, if the catalogue knows one. */
export function consoleKey(game: string): string | undefined {
  const c = (catalogData.consoleByGame as Record<string, string>)[game];
  return c ? 'console-' + c : undefined;
}

/** Tint for an art key ("award-alert-ribbon", "item-choicescarf"), per appearance. */
export function tintHex(key: string, dark: boolean): string | undefined {
  const c = (artColours as Record<string, { light: string; dark: string }>)[key];
  return c ? '#' + (dark ? c.dark : c.light) : undefined;
}

/** Frame colour for an award by rarity score, as the iPhone AwardIcon. */
export function tierColour(awardID: string): string {
  const score =
    (catalogData.rarity as Record<string, { score: number }>)[awardID]?.score ??
    0;
  return score >= 90
    ? '#BA63C4'
    : score >= 75
      ? '#D4A437'
      : score >= 60
        ? '#598FC8'
        : score >= 40
          ? '#77AA86'
          : '#ABB6BF';
}
