import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CatalogueView } from "./CatalogueView";
import Index from "@/pages/Index";

describe("CatalogueView Component", () => {
  it("renders the catalogue header and NMDS 2.0 standards badge", () => {
    render(<CatalogueView />);
    expect(screen.getByText(/Metadata Catalogue & Data Dictionary/i)).toBeInTheDocument();
    expect(screen.getByText(/NMDS 2.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Audited Datasets/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Total Records$/i).length).toBeGreaterThanOrEqual(1);
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

  it("toggles to Sample Data Preview mode and renders sample data rows for verified tables", () => {
    render(<CatalogueView />);

    // Click Sample Data Preview mode on default table (activity_asset has verified sample rows)
    const sampleModeBtn = screen.getByTestId("viewmode-sample");
    fireEvent.click(sampleModeBtn);

    // Verify verified sample data banner and table appear
    expect(screen.getByText(/Illustrative sample preview formatted to reflect activity_asset/i)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative Preview \(2 Rows\)/i)).toBeInTheDocument();
  });

  it("restricts Sample Data Preview button strictly to tables with sample rows (hides on tables without samples)", () => {
    render(<CatalogueView />);

    // Default table activity_asset has real sample rows -> button exists
    expect(screen.getByTestId("viewmode-sample")).toBeInTheDocument();

    // Click a table without sample rows (e.g., activity_community_service)
    const tableBtn = screen.getByTestId("table-btn-activity_community_service");
    fireEvent.click(tableBtn);

    // Verify sample mode button is hidden when no sample rows are supplied
    expect(screen.queryByTestId("viewmode-sample")).not.toBeInTheDocument();
  });

  it("restricts Evidence Artifacts view mode button strictly to tables with artifacts", () => {
    render(<CatalogueView />);

    // Switch to Panchayat Nirnay
    fireEvent.click(screen.getByTestId("filter-panchayat-nirnay"));

    // Table 1 (Unstructured_Meeting_Media) has evidenceArtifacts
    expect(screen.getByTestId("viewmode-evidence")).toBeInTheDocument();

    // Table 2 (Extraction_Audit_Report_20260625_050459) does NOT have evidenceArtifacts
    fireEvent.click(screen.getByTestId("table-btn-Extraction_Audit_Report_20260625_050459"));
    expect(screen.queryByTestId("viewmode-evidence")).not.toBeInTheDocument();
  });

  it("disambiguates table selection by dataset ID for duplicate table names across datasets", () => {
    render(<CatalogueView />);

    // In All Datasets view, PDF_Files appears across multiple datasets
    const pdfButtons = screen.getAllByTestId("table-btn-PDF_Files");
    expect(pdfButtons.length).toBeGreaterThan(1);

    // Click the ePanchayat Sabha PDF_Files instance
    const eSabhaPdfBtn = pdfButtons.find((btn) => btn.textContent?.includes("ePanchayat Sabha"));
    expect(eSabhaPdfBtn).toBeDefined();
    if (eSabhaPdfBtn) {
      fireEvent.click(eSabhaPdfBtn);
      // Verify detail card displays ePanchayat Sabha as dataset
      expect(screen.getByText(/Dataset:/i)).toBeInTheDocument();
      expect(screen.getByText("ePanchayat Sabha")).toBeInTheDocument();
    }
  });

  it("quotes SQL identifiers with hyphens and reserved characters when copying SQL", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CatalogueView />);

    // Switch to eGram Swaraj which contains table "2020-2021"
    fireEvent.click(screen.getByTestId("filter-egram-swaraj"));
    fireEvent.click(screen.getByTestId("table-btn-2020-2021"));

    // Copy SQL
    const copySqlBtn = screen.getByTestId("btn-copy-sql");
    fireEvent.click(copySqlBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedQuery = writeTextMock.mock.calls[0][0];
    expect(copiedQuery).toContain('FROM "2020-2021"');
  });

  it("renders export utilities (CSV export and Copy SQL buttons)", () => {
    render(<CatalogueView />);
    expect(screen.getByTestId("btn-copy-sql")).toBeInTheDocument();
    expect(screen.getByTestId("btn-export-csv")).toBeInTheDocument();
  });

  it("renders in-table category filter buttons and filters columns", () => {
    render(<CatalogueView />);
    
    const financialBtn = screen.getByTestId("filter-cat-financial");
    expect(financialBtn).toBeInTheDocument();
    fireEvent.click(financialBtn);

    const allBtn = screen.getByTestId("filter-cat-all");
    expect(allBtn).toBeInTheDocument();
    fireEvent.click(allBtn);
  });

  it("opens and closes Evidence Artifacts modal on Nirnay tables", () => {
    render(<CatalogueView />);

    // Switch to Nirnay
    fireEvent.click(screen.getByTestId("filter-panchayat-nirnay"));

    // Switch to Evidence Artifacts mode
    const evidenceBtn = screen.getByTestId("viewmode-evidence");
    expect(evidenceBtn).toBeInTheDocument();
    fireEvent.click(evidenceBtn);

    // Inspect first evidence card
    const card0 = screen.getByTestId("evidence-card-0");
    fireEvent.click(card0);

    // Verify modal is open
    expect(screen.getByTestId("evidence-modal-content")).toBeInTheDocument();
    expect(screen.getByText(/Government of Odisha • Panchayati Raj & Drinking Water/i)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId("btn-close-modal"));
    expect(screen.queryByTestId("evidence-modal-content")).not.toBeInTheDocument();
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
