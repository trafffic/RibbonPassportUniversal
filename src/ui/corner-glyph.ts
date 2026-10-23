export type Glyph =
  | 'done'
  | 'cancel'
  | 'save'
  | 'add'
  | 'edit'
  | 'export'
  | 'download'
  | 'options'
  | 'back';

/** Glyph for a corner title, as the iPhone TerminalCornerLabel picks it. */
export function cornerGlyph(title: string): Glyph {
  switch (title.toLowerCase()) {
    case 'done':
    case 'confirm':
      return 'done';
    case 'cancel':
    case 'close':
      return 'cancel';
    case 'save':
      return 'save';
    case 'add':
    case 'new':
      return 'add';
    case 'edit':
      return 'edit';
    case 'export':
      return 'export';
    case 'import':
      return 'download';
    default:
      return 'options';
  }
}
/** Save, Cancel, Done and Add show their word; other corner buttons are glyph-only. */
export const cornerLabelled = (title: string) =>
  ['save', 'cancel', 'done', 'add'].includes(title.toLowerCase());

