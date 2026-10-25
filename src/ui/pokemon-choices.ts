import { catalog, ruleData } from '../domain/catalog';

// Forms with a zero dex number inherit their species' National Pokédex number.
const dexNumber = (id: string) =>
  catalog.pokemon[id]?.natdex ||
  catalog.pokemon[ruleData.species[id]?.base ?? '']?.natdex || 0;

const speciesByDex = new Map<number, string>();
for (const id of Object.keys(catalog.pokemon)) {
  const number = dexNumber(id);
  if (number && ruleData.species[id]?.base === id && !speciesByDex.has(number)) {
    speciesByDex.set(number, id);
  }
}

export const speciesOptions = [...speciesByDex.entries()]
  .sort(([a], [b]) => a - b)
  .map(([number, id]) => ({
    id,
    name: `#${String(number).padStart(4, '0')} ${catalog.pokemon[id]!.name}`,
  }));

export const baseSpeciesID = (id: string) => speciesByDex.get(dexNumber(id)) ?? id;

function formName(id: string, base: string): string {
  if (id === base) return 'Standard';
  const name = catalog.pokemon[id]!.name;
  const baseName = catalog.pokemon[base]!.name;
  if (name.startsWith(`${baseName}-`)) return name.slice(baseName.length + 1).replace(/-/g, ' ');
  if (id.startsWith(`${base}-`)) {
    return id.slice(base.length + 1).split('-')
      .map((word) => word === 'phd' ? 'PhD' : word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  // Keep legacy catalogue aliases selectable without changing saved identities.
  return name;
}

const formsBySpecies = new Map<string, { id: string; name: string }[]>();
for (const id of Object.keys(catalog.pokemon)) {
  const base = baseSpeciesID(id);
  const forms = formsBySpecies.get(base) ?? [];
  forms.push({ id, name: formName(id, base) });
  formsBySpecies.set(base, forms);
}
for (const [base, forms] of formsBySpecies) {
  forms.sort((a, b) => a.id === base ? -1 : b.id === base ? 1 : a.name.localeCompare(b.name));
}

export const formOptions = (id: string) => formsBySpecies.get(baseSpeciesID(id)) ?? [];
