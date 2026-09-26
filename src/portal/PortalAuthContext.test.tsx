import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStore } from "@/api/client";
import type { PortalUser } from "@/api/types";
import { PortalAuthProvider, usePortalAuth } from "./PortalAuthContext";

vi.mock("@/lib/socket", () => ({ disconnectSocket: vi.fn() }));

const account = (id: string): PortalUser => ({
  id,
  fullName: `Account ${id}`,
  email: `${id}@example.com`,
  role: "admin",
});

const Probe = () => {
  const { user, loading, switchAccount } = usePortalAuth();
  const [localNotification] = useState(() => user ? `${user.id}-notification` : "anonymous-notification");
  if (loading) return <p>switching</p>;
  return <div>
    <p>{user?.id || "none"}</p>
    <p>{localNotification}</p>
    <button onClick={() => void switchAccount("account-a")}>A</button>
    <button onClick={() => void switchAccount("account-b")}>B</button>
  </div>;
};

describe("PortalAuthProvider account switching", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    const accountA = account("account-a");
    const accountB = account("account-b");
    localStorage.setItem("bnan_portal_user", JSON.stringify(accountA));
    localStorage.setItem("bnan_remembered_accounts", JSON.stringify([
      { user: accountA, token: "token-a", refreshToken: "refresh-a", lastUsedAt: "2026-09-26T10:00:00.000Z" },
      { user: accountB, token: "token-b", refreshToken: "refresh-b", lastUsedAt: "2026-09-26T09:00:00.000Z" },
    ]));
    tokenStore.set("token-a", "refresh-a", true);
  });

  afterEach(() => {
    tokenStore.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("isolates query and local notification state across A to B to A", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["student-home"], { owner: "account-a" });
    client.setQueryData(["notifications"], [{ owner: "account-a" }]);
    client.setQueryData(["teacher-settings-profile"], { owner: "account-a" });
    client.setQueryData(["public-courses"], [{ id: "public-course" }]);

    render(<QueryClientProvider client={client}><PortalAuthProvider><Probe /></PortalAuthProvider></QueryClientProvider>);
    expect(await screen.findByText("account-a")).toBeInTheDocument();
    expect(screen.getByText("account-a-notification")).toBeInTheDocument();

    fireEvent.click(screen.getByText("B"));
    expect(await screen.findByText("account-b")).toBeInTheDocument();
    expect(screen.getByText("account-b-notification")).toBeInTheDocument();
    expect(screen.queryByText("account-a-notification")).not.toBeInTheDocument();
    expect(client.getQueryData(["student-home"])).toBeUndefined();
    expect(client.getQueryData(["notifications"])).toBeUndefined();
    expect(client.getQueryData(["teacher-settings-profile"])).toBeUndefined();
    expect(client.getQueryData(["public-courses"])).toEqual([{ id: "public-course" }]);
    expect(tokenStore.get()).toBe("token-b");

    client.setQueryData(["student-home"], { owner: "account-b" });
    fireEvent.click(screen.getByText("A"));
    await waitFor(() => expect(screen.getByText("account-a")).toBeInTheDocument());
    expect(screen.getByText("account-a-notification")).toBeInTheDocument();
    expect(client.getQueryData(["student-home"])).toBeUndefined();
    expect(tokenStore.get()).toBe("token-a");
  });
});
