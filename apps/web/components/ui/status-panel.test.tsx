import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPanel } from "./status-panel";

describe("StatusPanel (spec: web-visual-coherence — Shared Status/Error Panel Usage)", () => {
  it("renders the pending variant with a spinner and role=status", () => {
    render(<StatusPanel variant="pending" title="Anclando…" />);

    const panel = screen.getByRole("status");
    expect(panel).toHaveTextContent("Anclando…");
    expect(panel.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders the success variant with the Check icon and role=status", () => {
    render(<StatusPanel variant="success" title="Certificado" />);

    const panel = screen.getByRole("status");
    expect(panel).toHaveTextContent("Certificado");
    expect(panel.querySelector("svg")).not.toBeNull();
  });

  it("renders the error variant with role=alert and the ShieldAlert icon", () => {
    render(<StatusPanel variant="error" title="Ocurrió un error" />);

    const panel = screen.getByRole("alert");
    expect(panel).toHaveTextContent("Ocurrió un error");
    expect(panel.querySelector("svg")).not.toBeNull();
  });

  it("renders the info variant with role=status and no icon by default", () => {
    render(<StatusPanel variant="info" title="Aviso" />);

    expect(screen.getByRole("status")).toHaveTextContent("Aviso");
  });

  it("renders children as the description below the title", () => {
    render(
      <StatusPanel variant="error" title="Error">
        Detalle del error
      </StatusPanel>,
    );

    expect(screen.getByText("Detalle del error")).toBeInTheDocument();
  });

  it("renders the action node when provided", () => {
    render(
      <StatusPanel variant="success" title="Certificado" action={<button>Ver</button>}>
        Listo
      </StatusPanel>,
    );

    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
  });

  it("allows overriding the default icon", () => {
    render(
      <StatusPanel
        variant="info"
        title="Aviso"
        icon={<svg data-testid="custom-icon" />}
      />,
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
