import { describe, expect, it, vi } from "vitest";
import {
  deleteAccountRecoverably,
  deleteMediaRecoverably,
} from "@/lib/deletion";

describe("recoverable media deletion", () => {
  it("restores the visible database row when Storage fails", async () => {
    const restore = vi.fn().mockResolvedValue(undefined);
    const finalize = vi.fn();
    const result = await deleteMediaRecoverably({
      begin: vi.fn().mockResolvedValue("owner/offer/image.webp"),
      removeStorage: vi.fn().mockRejectedValue(new Error("storage")),
      restore,
      finalize,
    });

    expect(result).toEqual({ ok: false, phase: "storage", pending: false });
    expect(restore).toHaveBeenCalledOnce();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("leaves a retryable outbox row when database finalization fails", async () => {
    const result = await deleteMediaRecoverably({
      begin: vi.fn().mockResolvedValue("owner/offer/image.webp"),
      removeStorage: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn(),
      finalize: vi.fn().mockRejectedValue(new Error("database")),
    });

    expect(result).toEqual({ ok: false, phase: "database", pending: true });
  });
});

describe("recoverable account deletion", () => {
  it("processes every Storage batch before finalizing", async () => {
    const batches = [
      Array.from({ length: 1000 }, (_, index) => `owner/a-${index}.webp`),
      ["owner/final.webp"],
      [],
    ];
    const removeStorage = vi.fn().mockResolvedValue(undefined);
    const confirmRemoved = vi.fn().mockResolvedValue(undefined);
    const finalize = vi.fn().mockResolvedValue(undefined);

    const result = await deleteAccountRecoverably({
      begin: vi.fn().mockResolvedValue(undefined),
      getPaths: vi.fn().mockImplementation(async () => batches.shift() ?? []),
      removeStorage,
      confirmRemoved,
      finalize,
    });

    expect(result).toEqual({ ok: true });
    expect(removeStorage).toHaveBeenCalledTimes(2);
    expect(removeStorage.mock.calls.at(0)?.[0]).toHaveLength(1000);
    expect(confirmRemoved).toHaveBeenCalledTimes(2);
    expect(finalize).toHaveBeenCalledOnce();
  });

  it("keeps the account closure pending when a Storage batch fails", async () => {
    const finalize = vi.fn();
    const result = await deleteAccountRecoverably({
      begin: vi.fn().mockResolvedValue(undefined),
      getPaths: vi.fn().mockResolvedValue(["owner/image.webp"]),
      removeStorage: vi.fn().mockRejectedValue(new Error("storage")),
      confirmRemoved: vi.fn(),
      finalize,
    });

    expect(result).toEqual({ ok: false, phase: "storage", pending: true });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("stops if database acknowledgement does not advance the outbox", async () => {
    const result = await deleteAccountRecoverably({
      begin: vi.fn().mockResolvedValue(undefined),
      getPaths: vi.fn().mockResolvedValue(["owner/image.webp"]),
      removeStorage: vi.fn().mockResolvedValue(undefined),
      confirmRemoved: vi.fn().mockResolvedValue(undefined),
      finalize: vi.fn(),
    });

    expect(result).toEqual({ ok: false, phase: "database", pending: true });
  });
});
