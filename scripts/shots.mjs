import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const pages = [
  { path: "/dashboard", file: "dashboard.png" },
  { path: "/calendar", file: "calendar.png" },
  { path: "/reviews", file: "reviews.png" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = await ctx.newPage();

for (const { path, file } of pages) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  // let charts/animations settle
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log(`saved ${OUT}/${file}`);
}

await browser.close();
