import { describe, expect, it } from "vitest";
import { localTestAuthEnabled, prelaunchMode } from "@/lib/env";

describe("local test auth gate", () => {
  it("requires both an explicit flag and a loopback Supabase origin", () => {
    expect(localTestAuthEnabled({})).toBe(false);
    expect(
      localTestAuthEnabled({
        PULPERIA_LOCAL_TEST_AUTH: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    ).toBe(false);
    expect(
      localTestAuthEnabled({
        PULPERIA_LOCAL_TEST_AUTH: "true",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toBe(true);
  });
});

describe("prelaunchMode", () => {
  it("is explicit and defaults to the launchable state", () => {
    expect(prelaunchMode({})).toBe(false);
    expect(prelaunchMode({ PULPERIA_PRELAUNCH: "false" })).toBe(false);
    expect(prelaunchMode({ PULPERIA_PRELAUNCH: "true" })).toBe(true);
  });
});
