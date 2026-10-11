import { configured, supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!configured())
    return new Response("Backend unavailable", { status: 503 });
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  let browser;
  try {
    const origin = new URL(req.url);
    const target = new URL("/print", origin);
    target.search = origin.search;
    browser = await puppeteer.launch({
      pipe: true,
      args: process.platform === "win32" ? [] : chromium.args,
      executablePath:
        process.platform === "win32"
          ? (process.env.CHROME_EXECUTABLE_PATH ??
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
          : await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.origin !== origin.origin && !r.url().startsWith("data:"))
        void r.abort();
      else
        void r.continue({
          headers: { ...r.headers(), cookie: req.headers.get("cookie") ?? "" },
        });
    });
    await page.goto(target.toString(), {
      waitUntil: "networkidle0",
      timeout: 45000,
    });
    if (new URL(page.url()).pathname !== "/print")
      throw new Error("Your session expired. Sign in again.");
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: origin.searchParams.get("paper") === "Letter" ? "Letter" : "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:9px;width:100%;text-align:center;color:#66715e">Reading Room · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
    });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="reading-room-collection.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Unable to render PDF. Use the print view instead.",
      },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
