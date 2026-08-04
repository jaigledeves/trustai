import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { historyDictionary } from "../../../dictionaries/es/history";
import type { TrustRecordListResponse } from "../../../lib/api/types";
import { server } from "../../../test/msw/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "token" }) })),
}));

// The controls + pagination are client islands (next/navigation) — mock them
// to markers so the RSC page test doesn't need a router context.
vi.mock("../../../components/history/DtrListControls", () => ({
  DtrListControls: () => <div>CONTROLS_ISLAND</div>,
}));
vi.mock("../../../components/history/DtrPagination", () => ({
  DtrPagination: () => <div>PAGINATION_ISLAND</div>,
}));

const { default: DtrsListPage } = await import("./page");

function stubList(
  response: TrustRecordListResponse,
  onRequest?: (url: URL) => void,
): void {
  server.use(
    http.get("http://localhost:3000/trust-records", ({ request }) => {
      onRequest?.(new URL(request.url));
      return HttpResponse.json(response);
    }),
  );
}

function renderPage(searchParams: Record<string, string>) {
  return DtrsListPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  } as never);
}

describe("DtrsListPage (spec: web-dtr-list — filtered & paginated list)", () => {
  it("forwards page/search/state from the URL to the backend query", async () => {
    let captured: URL | undefined;
    stubList({ items: [], total: 0, page: 2, pageSize: 20 }, (url) => {
      captured = url;
    });

    render(await renderPage({ page: "2", search: "contrato", state: "CERTIFIED" }));

    expect(captured?.searchParams.get("page")).toBe("2");
    expect(captured?.searchParams.get("search")).toBe("contrato");
    expect(captured?.searchParams.get("state")).toBe("CERTIFIED");
  });

  it("renders the controls, table and pagination when records exist", async () => {
    stubList({
      items: [
        {
          id: "tr-1",
          state: "CERTIFIED",
          filename: "doc.pdf",
          aiClassification: "Contrato",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(await renderPage({}));

    expect(screen.getByText("CONTROLS_ISLAND")).toBeInTheDocument();
    expect(screen.getByText("PAGINATION_ISLAND")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("passes hasActiveFilter through: a filtered no-match shows the no-matches message", async () => {
    stubList({ items: [], total: 0, page: 1, pageSize: 20 });

    render(await renderPage({ search: "zzz" }));

    expect(screen.getByText(historyDictionary.list.noMatches)).toBeInTheDocument();
  });

  it("shows the onboarding empty-state (not no-matches) when there is no active filter", async () => {
    stubList({ items: [], total: 0, page: 1, pageSize: 20 });

    render(await renderPage({}));

    expect(screen.getByText(historyDictionary.list.emptyState)).toBeInTheDocument();
  });
});
