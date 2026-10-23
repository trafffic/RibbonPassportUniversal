import test from 'node:test';
import assert from 'node:assert/strict';
import { cornerGlyph, cornerLabelled } from '../src/ui/corner-glyph';

test('corner buttons pick glyphs and labels like the iPhone TerminalCornerLabel', () => {
  assert.equal(cornerGlyph('Cancel'), 'cancel');
  assert.equal(cornerGlyph('Close'), 'cancel');
  assert.equal(cornerGlyph('Done'), 'done');
  assert.equal(cornerGlyph('Import'), 'download');
  assert.equal(cornerGlyph('Options'), 'options');
  assert.ok(cornerLabelled('Save') && cornerLabelled('cancel'));
  assert.ok(!cornerLabelled('Close') && !cornerLabelled('Edit'));
});
