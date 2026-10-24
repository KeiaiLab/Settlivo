import { describe, expect, test } from "vitest";
import { canTransition, transition } from "./invoice-status";
import type { Invoice } from "./types";

describe("invoice status machine", () => {
  test("valid path", () => {
    expect(canTransition("pending_approval", "scheduled")).toBe(true);
    expect(canTransition("scheduled", "sending")).toBe(true);
    expect(canTransition("sending", "confirmed")).toBe(true);
    expect(canTransition("sending", "failed")).toBe(true);
    expect(canTransition("failed", "scheduled")).toBe(true);
    expect(canTransition("pending_approval", "rejected")).toBe(true);
  });
  test("invalid moves", () => {
    expect(canTransition("scheduled", "scheduled")).toBe(false);
    expect(canTransition("confirmed", "sending")).toBe(false);
    expect(canTransition("rejected", "scheduled")).toBe(false);
  });
  test("transition appends history", () => {
    const inv = { status: "pending_approval", history: [] } as unknown as Invoice;
    const next = transition(inv, "scheduled", "worker:wrk_a");
    expect(next.status).toBe("scheduled");
    expect(next.history.at(-1)).toMatchObject({ status: "scheduled", by: "worker:wrk_a" });
    expect(() => transition(next, "confirmed", "x")).toThrow();
  });
});
