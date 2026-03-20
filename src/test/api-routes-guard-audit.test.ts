import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Policy: protected app/api/.../route.ts files import api-route-guard; no direct getCurrentUser /
// getApiSessionUser except api/me (full session fields after guard).
// Skips: api/auth (NextAuth), health/route.ts (public).

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const apiRoot = join(__dirname, "../app/api");

const DIRECT_AUTH_IMPORTS = [
  'from "@/lib/auth/current-user"',
  "from '@/lib/auth/current-user'",
  'from "@/lib/auth/require-api-user"',
  "from '@/lib/auth/require-api-user'",
];

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...listRouteFiles(p));
    } else if (name === "route.ts") {
      out.push(p);
    }
  }
  return out;
}

function posixRel(fullPath: string): string {
  return relative(apiRoot, fullPath).split("\\").join("/");
}

describe("API route guard policy", () => {
  it("every protected route.ts imports api-route-guard and avoids direct session helpers (except allowlist)", () => {
    const routes = listRouteFiles(apiRoot);
    const violations: string[] = [];

    for (const file of routes) {
      const rel = posixRel(file);
      if (rel.startsWith("auth/") || rel === "health/route.ts") continue;

      const src = readFileSync(file, "utf8");

      if (!src.includes("@/lib/auth/api-route-guard")) {
        violations.push(`${rel}: missing import from @/lib/auth/api-route-guard`);
        continue;
      }

      const isMeRoute = rel === "me/route.ts";
      for (const needle of DIRECT_AUTH_IMPORTS) {
        if (src.includes(needle)) {
          if (isMeRoute && needle.includes("current-user")) continue;
          violations.push(`${rel}: disallowed direct import ${needle}`);
        }
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
