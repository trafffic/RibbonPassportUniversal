import { displayedAwards, ruleData, sortAwards } from './catalog';
import {
  earningGames,
  laterGames,
  managedAwardIDs,
  transferCheck,
  unavailableReason,
} from './rules';
import type { Pokemon } from './model';
export type RibbonCategory = 'All' | 'Last chance' | 'Later gens';
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
      if (category === 'Last chance') return last.has(id);
      if (category === 'Later gens')
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
