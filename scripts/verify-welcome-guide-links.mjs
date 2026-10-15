import { strict as assert } from "node:assert";

const origin = "https://welcome.sekretbip.net";
const paths = [
  "/what-is-sekret-bip/",
  "/how-it-works/",
  "/privacy-and-safety/",
];

let failures = 0;

for (const path of paths) {
  const address = new URL(path, origin);
  try {
    const response = await fetch(address, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "text/html" },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) {
      failures += 1;
      console.error(`WELCOME_GUIDE_BLOCKED path=${path} http=${response.status} html=${contentType.includes("text/html")}`);
      continue;
    }
    const html = await response.text();
    if (!/<html[\s>]/i.test(html) || html.length < 100) {
      failures += 1;
      console.error(`WELCOME_GUIDE_BLOCKED path=${path} reason=invalid_html`);
      continue;
    }
    assert.equal(new URL(response.url).origin, origin);
    console.log(`WELCOME_GUIDE_REACHABLE path=${path} http=${response.status}`);
  } catch (error) {
    failures += 1;
    console.error(`WELCOME_GUIDE_BLOCKED path=${path} reason=${error instanceof Error ? error.name : "unknown"}`);
  }
}

if (failures) {
  console.error(`WELCOME_GUIDE_RELEASE_BLOCKED failures=${failures}`);
  process.exitCode = 1;
} else {
  console.log("WELCOME_GUIDE_LINK_READINESS_VERIFIED");
}
