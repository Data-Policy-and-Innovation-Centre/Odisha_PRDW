import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CatalogueView } from "./CatalogueView";
import Index from "@/pages/Index";

describe("CatalogueView Component", () => {
  it("renders the catalogue header and NMDS 2.0 standards badge", () => {
    render(<CatalogueView />);
    expect(screen.getByText(/Metadata Catalogue & Data Dictionary/i)).toBeInTheDocument();
    expect(screen.getByText(/NMDS 2.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Audited Datasets/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Audited Records/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope Architecture/i)).toBeInTheDocument();
  });

  it("renders all 6 dataset filter pill buttons dynamically from data", () => {
    render(<CatalogueView />);
    expect(screen.getByTestId("filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-panchayat-database")).toBeInTheDocument();
    expect(screen.getByTestId("filter-egram-swaraj")).toBeInTheDocument();
    expect(screen.getByTestId("filter-panchayat-nirnay")).toBeInTheDocument();
    expect(screen.getByTestId("filter-sabha-saar")).toBeInTheDocument();
    expect(screen.getByTestId("filter-epanchayat-sabha")).toBeInTheDocument();
    expect(screen.getByTestId("filter-meri-panchayat")).toBeInTheDocument();
  });

  it("filters tables when switching dataset tabs", () => {
    render(<CatalogueView />);
    
    // Switch to Panchayat Nirnay via testid
    const nirnayBtn = screen.getByTestId("filter-panchayat-nirnay");
    fireEvent.click(nirnayBtn);

    // Verify Nirnay specific unstructured media table is visible in sidebar
    expect(screen.getByTestId("table-btn-Unstructured_Meeting_Media")).toBeInTheDocument();

    // Verify unstructured variables are displayed in table
    expect(screen.getByText("Attendance_Register_Photo")).toBeInTheDocument();
    expect(screen.getByText("Meeting_Notes_Decision_Photo")).toBeInTheDocument();
    expect(screen.getByText("Meeting_Agenda_Notice_Photo")).toBeInTheDocument();
    expect(screen.getByText("Gram_Sabha_Video_Recording")).toBeInTheDocument();
  });

  it("filters variables dynamically when typing in search input", () => {
    render(<CatalogueView />);
    const searchInput = screen.getByPlaceholderText(/Search 1,900\+ variables/i);

    fireEvent.change(searchInput, { target: { value: "attendance" } });

    // Should enter search results mode
    expect(screen.getByText(/Found/i)).toBeInTheDocument();
    expect(screen.getByText(/matching variables for/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Attendance_Register_Photo/i).length).toBeGreaterThan(0);

    // Click clear button
    const clearBtn = screen.getByText("Clear");
    fireEvent.click(clearBtn);

    // Restores standard browse mode
    expect(screen.queryByText(/matching variables for/i)).not.toBeInTheDocument();
  });
});

describe("Catalogue Navigation in Index page", () => {
  it("switches to Catalogue tab when clicked in AppHeader", () => {
    render(<Index />);
    
    // Initial view is Ask
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Catalogue" })).toHaveAttribute("aria-selected", "false");

    // Click Catalogue tab
    const catalogueTab = screen.getByRole("tab", { name: "Catalogue" });
    fireEvent.click(catalogueTab);

    // Active tab is now Catalogue
    expect(catalogueTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Metadata Catalogue & Data Dictionary/i)).toBeInTheDocument();
  });
});
