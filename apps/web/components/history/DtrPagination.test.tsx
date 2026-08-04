import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { historyDictionary } from "../../dictionaries/es/history";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/dtrs",
}));

const { DtrPagination } = await import("./DtrPagination");

describe("DtrPagination (spec: web-dtr-list — Pagination Controls)", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("disables Previous on the first page and enables Next when more pages exist", () => {
    render(<DtrPagination page={1} pageSize={20} total={25} />);

    expect(
      screen.getByRole("button", { name: historyDictionary.list.paginationPrevious }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: historyDictionary.list.paginationNext }),
    ).toBeEnabled();
  });

  it("disables Next on the last page (page * pageSize >= total)", () => {
    render(<DtrPagination page={2} pageSize={20} total={25} />);

    expect(
      screen.getByRole("button", { name: historyDictionary.list.paginationNext }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: historyDictionary.list.paginationPrevious }),
    ).toBeEnabled();
  });

  it("shows the current position (page X of N)", () => {
    render(<DtrPagination page={2} pageSize={20} total={25} />);

    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("navigates to the next page preserving the active state/search filters", async () => {
    const user = userEvent.setup();
    render(<DtrPagination page={1} pageSize={20} total={25} state="CERTIFIED" search="contrato" />);

    await user.click(screen.getByRole("button", { name: historyDictionary.list.paginationNext }));

    expect(pushMock).toHaveBeenCalledWith("/dtrs?state=CERTIFIED&search=contrato&page=2", {
      scroll: false,
    });
  });

  it("navigates back to the previous page", async () => {
    const user = userEvent.setup();
    render(<DtrPagination page={3} pageSize={20} total={100} />);

    await user.click(
      screen.getByRole("button", { name: historyDictionary.list.paginationPrevious }),
    );

    expect(pushMock).toHaveBeenCalledWith("/dtrs?page=2", { scroll: false });
  });
});
