import test from "node:test";
import assert from "node:assert/strict";
import {
  exportRibbonsGuide,
  exportSource,
  importBackup,
} from "../src/backup/codec";
import {
  addPokemon,
  blankPokemon,
  emptyCollection,
} from "../src/domain/organisation";

test("app collections export complete guide metadata and capture defaults without changing local data", () => {
  const c = addPokemon(
    emptyCollection("c", "r", "box"),
    {
      ...blankPokemon("p"),
      species: "pikachu",
      currentgame: "sw",
      origingame: "sw",
    },
    "box",
    { id: "add", at: "2026-10-24T00:00:00Z" },
  );
  const before = JSON.stringify(c);
  const out = JSON.parse(exportRibbonsGuide(c));
  assert.equal(out.fileVersion, 5);
  assert.deepEqual(out.settings, {});
  assert.equal(out.lastModified, Date.parse("2026-10-24T00:00:00Z"));
  assert.equal(out.boxes.length, 3);
  assert.equal(out.pokemon[0].ball, "poke");
  assert.equal(out.pokemon[0].language, "en");
  assert.equal(out.pokemon[0].gender, "unknown");
  assert.deepEqual(out.pokemon[0].achievements, []);
  assert.equal(out.pokemon[0].notes, "");
  assert.equal(JSON.stringify(c), before);
});

test("guide exports retain recorded capture details, square shininess, notes and settings", () => {
  const c = importBackup(
    JSON.stringify({
      fileVersion: 5,
      settings: { theme: "dark" },
      boxes: ["Home"],
      pokemon: [
        {
          species: "pikachu",
          currentgame: "sw",
          origingame: "sw",
          currentlevel: 50,
          ribbons: ["effort-ribbon"],
          ball: "master",
          language: "ja",
          shiny: "square",
          notes: "Keep my notes",
          trainerid: "000123",
          futureCapture: { keep: true },
        },
      ],
    }),
    "c",
    "r",
  );
  const out = JSON.parse(exportRibbonsGuide(c));
  assert.deepEqual(out.settings, { theme: "dark" });
  assert.equal(out.pokemon[0].ball, "master");
  assert.equal(out.pokemon[0].language, "ja");
  assert.equal(out.pokemon[0].shiny, "square");
  assert.equal(out.pokemon[0].notes, "Keep my notes");
  assert.equal(out.pokemon[0].trainerid, "000123");
  assert.deepEqual(out.pokemon[0].futureCapture, { keep: true });
});

test("unsupported guide values produce an explanation instead of an unusable destination file", () => {
  const original = JSON.stringify({
    fileVersion: 5,
    boxes: ["Home"],
    pokemon: [
      {
        species: "pikachu",
        currentgame: "sw",
        ribbons: ["future-award"],
      },
    ],
  });
  const c = importBackup(original, "c", "r");
  assert.throws(
    () => exportRibbonsGuide(c),
    /does not support the award future-award/,
  );
  assert.equal(exportSource(c), original);
});
