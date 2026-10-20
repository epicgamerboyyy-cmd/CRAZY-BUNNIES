import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { logError } = await import("./request");

describe("logError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("drops query parameters so client details never reach the logs", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(
      new Error('Failed query: insert into "bookings" ("customer_name", "phone") values ($1, $2)\nparams: Thandi Mokoena,082 123 4567'),
      { cause: { code: "23P01", message: "conflicting key value violates exclusion constraint" } },
    );
    logError("booking create", err);
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain("Thandi");
    expect(logged).not.toContain("082 123 4567");
    expect(logged).toContain("Failed query");
    expect(logged).toContain("23P01");
  });
});
