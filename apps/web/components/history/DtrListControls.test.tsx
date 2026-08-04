import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { historyDictionary } from "../../dictionaries/es/history";

const replaceMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => "/dtrs",
}));

const { DtrListControls } = await import("./DtrListControls");

describe("DtrListControls (spec: web-dtr-list — List Search & Filter Controls)", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    pushMock.mockClear();
  });

  it("reflects the current search and state from props", () => {
    render(<DtrListControls search="contrato" state="CERTIFIED" />);

    expect(screen.getByLabelText(historyDictionary.list.searchLabel)).toHaveValue("contrato");
    expect(screen.getByLabelText(historyDictionary.list.stateFilterLabel)).toHaveValue(
      "CERTIFIED",
    );
  });

  it("pushes a debounced search into the URL and resets to page 1 (no page param), preserving state", async () => {
    const user = userEvent.setup();
    render(<DtrListControls search={undefined} state="READY" />);

    await user.type(screen.getByLabelText(historyDictionary.list.searchLabel), "informe");

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/dtrs?state=READY&search=informe", {
        scroll: false,
      }),
    );
    expect(replaceMock.mock.calls.at(-1)?.[0]).not.toContain("page=");
  });

  it("navigates on a state change, resetting to page 1 and preserving the active search", async () => {
    const user = userEvent.setup();
    render(<DtrListControls search="contrato" state={undefined} />);

    await user.selectOptions(
      screen.getByLabelText(historyDictionary.list.stateFilterLabel),
      "CERTIFIED",
    );

    expect(pushMock).toHaveBeenCalledWith("/dtrs?state=CERTIFIED&search=contrato", {
      scroll: false,
    });
    expect(pushMock.mock.calls.at(-1)?.[0]).not.toContain("page=");
  });

  it("removes the search param when the input is cleared", async () => {
    const user = userEvent.setup();
    render(<DtrListControls search="contrato" state={undefined} />);

    await user.clear(screen.getByLabelText(historyDictionary.list.searchLabel));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dtrs", { scroll: false }));
  });

  it("resetting the state to 'all' drops the state param", async () => {
    const user = userEvent.setup();
    render(<DtrListControls search={undefined} state="CERTIFIED" />);

    await user.selectOptions(screen.getByLabelText(historyDictionary.list.stateFilterLabel), "");

    expect(pushMock).toHaveBeenCalledWith("/dtrs", { scroll: false });
  });
});
