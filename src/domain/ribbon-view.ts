import { displayedAwards, generation, ruleData, sortAwards } from "./catalog";
import {
  earningGames,
  laterGames,
  managedAwardIDs,
  optionalSizeMarks,
  transferCheck,
  unavailableReason,
} from "./rules";
import type { Pokemon } from "./model";
export const ribbonPageSizes = [6, 12, 24];
export const validPageSize = (value: unknown) =>
  typeof value === "number" && ribbonPageSizes.includes(value)
    ? value
    : value === 32
      ? 24
      : 12;
export const nextPageSize = (value: unknown) =>
  ribbonPageSizes[
    (ribbonPageSizes.indexOf(validPageSize(value)) + 1) % ribbonPageSizes.length
  ]!;
export type RibbonCategory = "All" | "Last chance" | "Later gens";
export function ribbonView(
  p: Pokemon,
  game: string,
  catalogue: boolean,
  earnable: boolean,
  category: RibbonCategory,
) {
  const last = new Set(transferCheck(game, p).lastChance),
    owned = new Set([...p.ribbons, ...displayedAwards(p)]);
  const candidates = sortAwards(
    managedAwardIDs.filter((id) => {
      if (optionalSizeMarks.includes(id)) return false;
      if (!catalogue && !ruleData.awards[id]?.games.includes(game))
        return false;
      if (
        earnable &&
        (owned.has(id) ||
          (catalogue
            ? !earningGames(id, p).length
            : !!unavailableReason(id, game, p)))
      )
        return false;
      if (category === "Last chance") return last.has(id);
      if (category === "Later gens")
        return !owned.has(id) && !!laterGames(id, game, p).length;
      return true;
    }),
  );
  const priority = (id: string) =>
    owned.has(id)
      ? 3
      : last.has(id)
        ? 0
        : laterGames(id, game, p).length
          ? 2
          : !unavailableReason(id, game, p)
            ? 1
            : 4;
  return candidates.sort((a, b) => priority(a) - priority(b));
}

export type TileTone = "owned" | "last" | "open";
export interface TileStatus {
  label: string;
  tone: TileTone;
  optional: boolean;
  /** What the one-tap strip does: record in the browsed game, remove, or open details. */
  action: "record" | "remove" | "details";
}

/** Status line and quick action for one ribbon tile on the board. */
export function tileStatus(
  p: Pokemon,
  id: string,
  game: string,
  flags: { owned: boolean; lastChance: boolean },
): TileStatus {
  const optional = optionalSizeMarks.includes(id);
  if (flags.owned)
    return {
      label: "✓ Owned",
      tone: "owned",
      optional,
      action: p.ribbons.includes(id) ? "remove" : "details",
    };
  const available = earningGames(id, p),
    here = available.includes(game),
    gen = here ? generation(game) : available.length
      ? Math.min(...available.map(generation)) : undefined;
  return {
    label: flags.lastChance
      ? "Last chance"
      : optional
        ? "Optional"
        : gen
          ? `Gen ${["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][gen] ?? gen}`
          : "Unavailable",
    tone: flags.lastChance ? "last" : "open",
    optional,
    action: here ? "record" : "details",
  };
}
