import { test, expect, type Page } from "@playwright/test";
import { backups, button, importText, download } from "./helpers";

const pokemon = (id: string, competitive = false) => ({
  id,
  species: "pikachu",
  nickname: competitive ? "Battler" : "Ribbon test",
  origingame: "scar",
  currentgame: "scar",
  currentlevel: 50,
  ribbons: [],
  ...(competitive
    ? {
        showdownSet: {
          item: "",
          ability: "",
          nature: "",
          evs: "",
          ivs: "",
          teraType: "",
          moves: [],
        },
      }
    : {}),
});
const boxes = (prefix: string, occupant: string) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: prefix + i,
    name: `Box 0${i + 1}`,
    slots: Array.from({ length: 30 }, (_, slot) =>
      i === 0 && slot === 0 ? occupant : null,
    ),
  }));
const fixture = JSON.stringify({
  format: "ribbon-passport",
  version: 1,
  collection: {
    pokemon: [pokemon("ribbon"), pokemon("battle", true)],
    teams: [],
    selectedID: "ribbon",
    storage: { boxes: boxes("r", "ribbon"), partyIDs: [] },
    competitiveStorage: { boxes: boxes("s", "battle"), partyIDs: [] },
  },
});
async function prepare(page: Page) {
  await page.goto("/");
  await backups(page);
  await importText(page, fixture);
}

test("mobile Ribbons and Competitive boxes fit without page or box-strip scrolling", async ({
  page,
}, info) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 700, "Mobile website layout");
  await prepare(page);
  for (const route of ["/", "/competitive"]) {
    await page.goto(route);
    const storage = page.getByTestId("mobile-storage");
    await expect(storage).toBeVisible();
    for (const height of [640, 740, 844]) {
      await page.setViewportSize({ width: page.viewportSize()!.width, height });
      await expect
        .poll(() =>
          storage.evaluate((el) => {
            for (
              let node: Element | null = el;
              node;
              node = node.parentElement
            ) {
              if (
                node.scrollHeight > node.clientHeight + 1 &&
                ["auto", "scroll"].includes(getComputedStyle(node).overflowY)
              )
                return true;
            }
            return document.documentElement.scrollHeight > innerHeight + 1;
          }),
        )
        .toBe(false);
      const board = (await page.getByTestId("pc-artwork").boundingBox())!;
      expect(board.height).toBeGreaterThan(90);
      expect(board.width / board.height).toBeCloseTo(208 / 192, 2);
      for (const label of [
        "All boxes",
        "Add box",
        "Box options",
        route === "/" ? "Open passport" : "Open build",
      ]) {
        const rect = (await button(page, label).boundingBox())!;
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.y + rect.height).toBeLessThanOrEqual(height);
      }
    }
    await page.screenshot({
      path: info.outputPath(
        route === "/" ? "ribbon-box.png" : "competitive-box.png",
      ),
    });
  }
});

test("adding a box is directly available in both sections and persists", async ({
  page,
}) => {
  await prepare(page);
  for (const route of ["/", "/competitive"]) {
    await page.goto(route);
    await button(page, "Add box").click();
    await expect(button(page, "Rename Box 04")).toBeVisible();
    await page.reload();
    await expect(button(page, "Rename Box 04")).toBeVisible();
    await button(page, "All boxes").click();
    await expect(button(page, "Box 04 · 0/30")).toBeVisible();
    await button(page, "Cancel").click();
  }
});

test("the undo notice lasts three seconds and restarts for each new change", async ({
  page,
}) => {
  await prepare(page);
  await page.clock.install();
  await button(page, "Add box").click();
  await expect(button(page, "Undo last change")).toBeVisible();
  await page.clock.fastForward(2900);
  await expect(button(page, "Undo last change")).toBeVisible();
  await page.clock.fastForward(200);
  await expect(button(page, "Undo last change")).toHaveCount(0);
  await expect(button(page, "Rename Box 04")).toBeVisible();
  await button(page, "Add box").click();
  await expect(button(page, "Undo last change")).toBeVisible();
  await button(page, "Undo last change").click();
  await expect(button(page, "Rename Box 04")).toBeVisible();
});

test("explicit ribbons.guide export has the required website format and metadata", async ({
  page,
}) => {
  await prepare(page);
  await backups(page);
  const guide = JSON.parse(await download(page, "Export for ribbons.guide"));
  expect(guide.fileVersion).toBe(5);
  expect(guide.settings).toEqual({});
  expect(Number.isFinite(guide.lastModified)).toBe(true);
  expect(guide.boxes).toHaveLength(3);
  expect(guide.pokemon).toHaveLength(1);
  expect(guide.pokemon[0].nickname).toBe("Ribbon test");
  expect(guide.pokemon[0].box).toBe(0);
});

test("single Pokémon exports use ribbons.guide format for ribbon and competitive Pokémon", async ({
  page,
}) => {
  await prepare(page);
  for (const [route, name] of [
    ["/", "Ribbon test"],
    ["/competitive", "Battler"],
  ]) {
    await page.goto(route!);
    await button(page, "Pokémon actions").click();
    await button(page, "Export Pokémon").click();
    await button(page, "ribbons.guide").click();
    const guide = JSON.parse(await download(page, "Save JSON file"));
    expect(guide.fileVersion).toBe(5);
    expect(guide.settings).toEqual({});
    expect(guide.pokemon).toHaveLength(1);
    expect(guide.pokemon[0].nickname).toBe(name);
    expect(guide.pokemon[0].showdownSet).toBeUndefined();
    expect(guide.boxes).toHaveLength(1);
    await button(page, "Done").click();
  }
});
