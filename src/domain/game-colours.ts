// GameTitleColour.colour(_:dark:) from Shared/RetroStyle.swift.
const groups: [string[], string, string][] = [
  [['red', 'ruby'], 'A93241', 'F48B8D'],
  [['blue', 'sapphire', 'as'], '2361AE', '82B2FF'],
  [['green', 'emerald', 'lg', 'lg-switch'], '167455', '79DCB6'],
  [['yellow', 'lgp'], '827210', 'F8E681'],
  [['gold', 'hg'], '805D0B', 'F4D279'],
  [['silver', 'ss'], '556B7B', 'C5D4E4'],
  [['crystal'], '236E8A', '8EDDEB'],
  [['fr', 'fr-switch', 'or'], 'B54426', 'F8A38B'],
  [['colosseum'], '745298', 'D1ABE8'],
  [['xd', 'xd-nso'], '785120', 'F6C276'],
  [['diamond', 'bd'], '376889', '9ED5F4'],
  [['pearl', 'sp'], '915076', 'F0AED8'],
  [['platinum'], '625587', 'CDC0F2'],
  [['black', 'black2'], '272E3C', 'B9C4DA'],
  [['white', 'white2'], '607588', 'E1EAF4'],
  [['x'], '2565A7', '8DB8FF'],
  [['y'], 'B73549', 'F79CA7'],
  [['sun', 'usun'], '915A08', 'FFD085'],
  [['moon', 'umoon'], '65499B', 'C2AAFF'],
  [['sw'], '337594', '95D8FF'],
  [['sh'], 'AC3F70', 'F9A9CF'],
  [['pla'], '507257', 'B4D5A7'],
  [['scar'], 'B54138', 'FF9D8D'],
  [['vio'], '6B43A3', 'CAB0FF'],
  [['go'], '296EAD', '9DC9FD'],
  [['lge'], '775131', 'D5B18A'],
  [['plza'], '2C7A64', '99E2CC'],
];
export function gameColour(game: string, dark: boolean) {
  const row = groups.find(([ids]) => ids.includes(game));
  return '#' + (row ? row[dark ? 2 : 1] : dark ? 'A6CCE8' : '315D7B');
}
