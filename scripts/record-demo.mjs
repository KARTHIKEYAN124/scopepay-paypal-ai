import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// Preview only: record actual hosted functionality without pretending a
// sandbox payment succeeded. The final submission needs payment footage.
const output = resolve(".artifacts/video");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: output, size: { width: 1440, height: 1000 } },
  acceptDownloads: true,
});
const page = await context.newPage();
async function caption(text, hold = 6000) {
  await page.evaluate((text) => {
    let box = document.getElementById("recording-caption");
    if (!box) {
      box = document.createElement("div");
      box.id = "recording-caption";
      box.style.cssText =
        "position:fixed;bottom:14px;left:16px;right:16px;padding:14px 24px;background:#102442;color:white;border-radius:10px;z-index:99999;font:20px/1.5 system-ui;pointer-events:none;box-shadow:0 2px 12px #0003";
      document.body.appendChild(box);
    }
    box.textContent = text;
  }, text);
  await page.waitForTimeout(hold);
}
try {
  await page.goto("https://scopepay-6ac67660.appwrite.network", {
    waitUntil: "networkidle",
  });
  await page.getByText("Connected", { exact: true }).waitFor();
  await caption(
    "ScopePay: a clear freelance scope, connected to milestone payments. Functional preview.",
    8000,
  );
  await caption(
    "Start with a client brief and budget. Real Groq AI drafts three milestones; local Ollama is also supported.",
    5000,
  );
  await page
    .getByRole("button", { name: "Generate proposal", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Review your proposal", exact: true })
    .waitFor({ timeout: 45000 });
  await caption(
    "This is actual AI output. Review deliverables, acceptance criteria, assumptions and exclusions before approval.",
    9000,
  );
  await page.getByRole("checkbox").first().scrollIntoViewIfNeeded();
  await caption(
    "A human approves the scope. Server-calculated milestone amounts must add up to the budget.",
    7000,
  );
  await page.getByRole("checkbox").first().check();
  await page
    .getByRole("button", { name: "Approve scope", exact: true })
    .click();
  await page.getByText(/Approved proposal/).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await caption(
    "Approved scope locks the payment plan. PayPal Orders v2 handles buyer approval and server-side capture.",
    9000,
  );
  await caption(
    "Sandbox credentials and a real capture test are still pending. No payment or receipt is simulated in this preview.",
    9000,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Saved projects", exact: true })
    .click();
  await page.getByText(/Acme Studio.*Approved/).waitFor();
  await caption(
    "Reloading preserves the approved project in a private Appwrite browser workspace.",
    8000,
  );
  await caption(
    "Open source with an MIT license and complete setup instructions: github.com/KARTHIKEYAN124/scopepay-paypal-ai",
    8000,
  );
  await context.close();
  await page.video().saveAs(resolve(output, "scopepay-preview.webm"));
  console.log(
    "Saved .artifacts/video/scopepay-preview.webm. Preview only; add actual verified payment footage before final submission.",
  );
} finally {
  await browser.close();
}
