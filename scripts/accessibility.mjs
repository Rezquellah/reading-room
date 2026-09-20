import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("http://127.0.0.1:3000");
const r = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
console.log(
  JSON.stringify(
    r.violations.map((v) => ({
      id: v.id,
      details: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    null,
    2,
  ),
);
await page.getByRole('button',{name:'Dark',exact:true}).click();
const dark=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
console.log('Dark theme:',JSON.stringify(dark.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),null,2));
await browser.close();
