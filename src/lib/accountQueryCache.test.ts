import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { clearAccountScopedQueries } from "./accountQueryCache";

describe("clearAccountScopedQueries", () => {
  it("removes private account data while preserving public cached data", async () => {
    const client = new QueryClient();
    client.setQueryData(["student-home"], { owner: "account-a" });
    client.setQueryData(["notifications"], [{ owner: "account-a" }]);
    client.setQueryData(["teacher-settings-profile"], { owner: "account-a" });
    client.setQueryData(["student-chat-rooms"], [{ owner: "account-a" }]);
    client.setQueryData(["public-courses"], [{ id: "course-1" }]);
    client.setQueryData(["public-course", "course-1"], { id: "course-1" });
    client.setQueryData(["courses", "public"], [{ id: "course-1" }]);

    await clearAccountScopedQueries(client);

    expect(client.getQueryData(["student-home"])).toBeUndefined();
    expect(client.getQueryData(["notifications"])).toBeUndefined();
    expect(client.getQueryData(["teacher-settings-profile"])).toBeUndefined();
    expect(client.getQueryData(["student-chat-rooms"])).toBeUndefined();
    expect(client.getQueryData(["public-courses"])).toEqual([{ id: "course-1" }]);
    expect(client.getQueryData(["public-course", "course-1"])).toEqual({ id: "course-1" });
    expect(client.getQueryData(["courses", "public"])).toEqual([{ id: "course-1" }]);
  });

  it("ignores a late result from a cancelled account request", async () => {
    const client = new QueryClient();
    let resolveRequest!: (value: { owner: string }) => void;
    const pending = client.fetchQuery({
      queryKey: ["student-home"],
      queryFn: () => new Promise<{ owner: string }>((resolve) => { resolveRequest = resolve; }),
    }).catch(() => undefined);

    await clearAccountScopedQueries(client);
    resolveRequest({ owner: "account-a" });
    await pending;

    expect(client.getQueryData(["student-home"])).toBeUndefined();
  });
});

