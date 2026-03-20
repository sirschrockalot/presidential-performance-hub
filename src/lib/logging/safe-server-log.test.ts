import { describe, it, expect, vi, afterEach } from "vitest";

import { estimateJsonCharLength, logPerfMetric } from "./safe-server-log";

describe("safe-server-log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("estimateJsonCharLength reflects structure size without emitting strings to callers", () => {
    const secret = "SECRET_PII_VALUE";
    const n = estimateJsonCharLength({ user: { email: secret } });
    expect(n).toBeGreaterThan(secret.length);
    // Guard: utility is for metrics only — never log the object itself in production code.
    expect(n).toBeGreaterThan(10);
  });

  it("logPerfMetric drops nested objects and only passes scalars to console", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logPerfMetric("unit_test", {
      ms: 12,
      ok: true,
      // @ts-expect-error intentional bad shape
      bad: { nested: "x" },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toEqual({ ms: 12, ok: true });
    expect(JSON.stringify(payload)).not.toContain("nested");
  });
});
