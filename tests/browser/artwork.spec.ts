import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { button, demo } from "./helpers";

const { PNG } = createRequire(process.cwd() + "/package.json")("pngjs");

test("3DS origin icon shows the surrounding panel through transparent pixels in both themes", async ({
  page,
}) => {
  await demo(page);
  for (const theme of ["Light", "Dark"]) {
    await page.goto("/settings");
    await button(page, theme).click();
    await page.goto("/passport/sample-collection-v1-pokemon-4");
    const icon = page
      .locator('img[alt="Origin console: 3ds"]')
      .filter({ visible: true })
      .first();
    await expect(icon).toBeVisible();
    await expect
      .poll(() =>
        icon.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(
      await icon.evaluate((el) => getComputedStyle(el).imageRendering),
    ).toBe("auto");
    const backdrop = await icon.evaluate((el) => {
      for (
        let parent = el.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const color = getComputedStyle(parent).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent")
          return color;
      }
      throw new Error("No opaque panel behind origin icon");
    });
    const rgb = backdrop.match(/\d+/g)!.slice(0, 3).map(Number);
    for (const size of [14, 18, 24, 32]) {
      await icon.evaluate((el, pixels) => {
        // Exercise the actual image renderer at compact and enlarged icon sizes.
        for (const box of [el.parentElement, el.parentElement?.parentElement]) {
          if (box) {
            box.style.width = `${pixels}px`;
            box.style.height = `${pixels}px`;
          }
        }
      }, size);
      const rendered = PNG.sync.read(await icon.screenshot());
      for (const [x, y] of [
        [0, 0],
        // Centers of both screens must expose the same panel as the outside.
        [
          Math.floor(rendered.width / 2),
          Math.floor((rendered.height * 18) / 64),
        ],
        [
          Math.floor(rendered.width / 2),
          Math.floor((rendered.height * 46) / 64),
        ],
      ] as const) {
        const offset = (y * rendered.width + x) * 4;
        expect(
          [...rendered.data.subarray(offset, offset + 4)],
          `${theme} ${size}px transparency at ${x},${y}`,
        ).toEqual([...rgb, 255]);
      }
      // Straight edges must remain visible, not just the rounded corners.
      for (const [x, y] of [
        [Math.floor(size / 2), Math.floor((size * 2) / 64)],
        [Math.floor((size * 3) / 64), Math.floor((size * 18) / 64)],
        [size - 1 - Math.floor((size * 3) / 64), Math.floor((size * 18) / 64)],
        [Math.floor(size / 2), size - 1 - Math.floor((size * 2) / 64)],
      ] as const) {
        // Fractional flex positions can add one background pixel to a screenshot.
        const visible = [-1, 0, 1].some((dx) =>
          [-1, 0, 1].some((dy) => {
            const px = x + dx,
              py = y + dy;
            if (
              px < 0 ||
              py < 0 ||
              px >= rendered.width ||
              py >= rendered.height
            )
              return false;
            const offset = (py * rendered.width + px) * 4;
            return [...rendered.data.subarray(offset, offset + 3)].some(
              (value, i) => Math.abs(value - rgb[i]!) > 15,
            );
          }),
        );
        expect(visible, `${theme} ${size}px straight edge at ${x},${y}`).toBe(
          true,
        );
      }
    }
  }
});
