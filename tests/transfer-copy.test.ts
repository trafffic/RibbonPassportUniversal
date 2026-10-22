import test from 'node:test';
import assert from 'node:assert/strict';
import { transferTitle, transferSummary, generationLabel } from '../src/domain/transfer-copy';
import type { TransferCheck } from '../src/domain/rules';

const base: TransferCheck = { canAssess: true, generation: 9, lastChance: [], canWait: [], warnings: [], isSafe: false };

test('no later generation reads as the latest generation', () => {
  assert.equal(transferTitle(base), 'Latest generation reached');
  assert.match(transferSummary(base), /Nothing to transfer to yet/);
  assert.equal(generationLabel(base), 'Gen IX');
});

test('last-chance ribbons block the transfer and are counted', () => {
  const t = { ...base, generation: 8, nextGeneration: 9, lastChance: ['alert-ribbon'] };
  assert.equal(transferTitle(t), 'Not safe to leave Gen VIII');
  assert.equal(transferSummary(t), '1 last-chance ribbon to earn first');
  assert.equal(generationLabel(t), 'Gen VIII → Gen IX');
});

test('a clean check with a next generation is ready to move up', () => {
  const t = { ...base, generation: 8, nextGeneration: 9, isSafe: true };
  assert.equal(transferTitle(t), 'Ready to move up');
  assert.equal(generationLabel(t), 'Gen VIII → Gen IX');
});

test('warnings and unassessable states have their own wording', () => {
  assert.equal(transferTitle({ ...base, nextGeneration: 10, warnings: ['x'] }), 'Check Footprint Ribbon before leaving Gen IX');
  assert.equal(transferTitle({ canAssess: false, lastChance: [], canWait: [], warnings: [], isSafe: false }), "Choose this Pokémon's current game");
});
