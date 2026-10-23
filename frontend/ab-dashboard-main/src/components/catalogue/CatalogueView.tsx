import React, { useState, useMemo, useEffect } from "react";
import catalogPayload from "@/data/metadataCatalog.json";
import type {
  MetadataCatalogPayload,
  DatasetCatalog,
  TableSchema,
  VariableSchema,
  EvidenceArtifact,
} from "@/types/catalogue";
import {
  Database,
  Search,
  Layers,
  FileText,
  Camera,
  Video,
  Table as TableIcon,
  ShieldCheck,
  CheckCircle2,
  Info,
  ChevronRight,
  Filter,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  KeyRound,
  Download,
  Copy,
  Check,
  Eye,
  FileSpreadsheet,
  X,
  FileCode,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const catalogData = catalogPayload as unknown as MetadataCatalogPayload;

export function CatalogueView() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("all");
  const [selectedTableRef, setSelectedTableRef] = useState<{ datasetId?: string; tableName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sidebarFilter, setSidebarFilter] = useState<string>("");

  // Interactive View Mode for selected table: "schema" | "sample" | "evidence"
  const [viewMode, setViewMode] = useState<"schema" | "sample" | "evidence">("schema");

  // In-table variable category filter
  const [variableCategory, setVariableCategory] = useState<string>("all");
  const [inTableSearch, setInTableSearch] = useState<string>("");

  // Modal state for Evidence Artifact Inspector
  const [inspectedArtifact, setInspectedArtifact] = useState<EvidenceArtifact | null>(null);

  // Copy SQL feedback state
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Datasets list
  const datasets = catalogData.datasets;

  // Selected dataset
  const activeDataset: DatasetCatalog | undefined = useMemo(() => {
    if (selectedDatasetId === "all") return undefined;
    return datasets.find((d) => d.id === selectedDatasetId);
  }, [datasets, selectedDatasetId]);

  // Tables available for current view
  const availableTables: { datasetName: string; datasetId: string; table: TableSchema }[] = useMemo(() => {
    if (activeDataset) {
      return activeDataset.tables.map((t) => ({
        datasetName: activeDataset.name,
        datasetId: activeDataset.id,
        table: t,
      }));
    }
    // "all" view
    return datasets.flatMap((d) =>
      d.tables.map((t) => ({
        datasetName: d.name,
        datasetId: d.id,
        table: t,
      }))
    );
  }, [activeDataset, datasets]);

  // Filter tables in sidebar
  const filteredSidebarTables = useMemo(() => {
    if (!sidebarFilter.trim()) return availableTables;
    const q = sidebarFilter.toLowerCase().trim();
    return availableTables.filter(
      (item) =>
        item.table.name.toLowerCase().includes(q) ||
        item.table.description.toLowerCase().includes(q)
    );
  }, [availableTables, sidebarFilter]);

  // Automatically select the first table if none selected or if selection is invalid (matching datasetId + tableName)
  const currentTableItem = useMemo(() => {
    if (selectedTableRef) {
      const match = availableTables.find(
        (item) =>
          item.table.name === selectedTableRef.tableName &&
          (!selectedTableRef.datasetId || item.datasetId === selectedTableRef.datasetId)
      );
      if (match) return match;
    }
    return filteredSidebarTables[0] || availableTables[0];
  }, [availableTables, filteredSidebarTables, selectedTableRef]);


  // Filtered variables based on global search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();

    const results: {
      datasetName: string;
      datasetId: string;
      tableName: string;
      variable: VariableSchema;
    }[] = [];

    for (const d of datasets) {
      for (const t of d.tables) {
        for (const v of t.variables) {
          if (
            v.name.toLowerCase().includes(query) ||
            v.description.toLowerCase().includes(query) ||
            t.name.toLowerCase().includes(query) ||
            d.name.toLowerCase().includes(query)
          ) {
            results.push({
              datasetName: d.name,
              datasetId: d.id,
              tableName: t.name,
              variable: v,
            });
          }
        }
      }
    }
    return results;
  }, [searchQuery, datasets]);

  // Filter variables inside the currently selected table
  const displayedVariables = useMemo(() => {
    if (!currentTableItem) return [];
    let vars = currentTableItem.table.variables;

    if (inTableSearch.trim()) {
      const q = inTableSearch.toLowerCase().trim();
      vars = vars.filter((v) => v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
    }

    if (variableCategory !== "all") {
      vars = vars.filter((v) => {
        const type = v.type.toUpperCase();
        const name = v.name.toLowerCase();
        if (variableCategory === "financial") {
          return (
            type.includes("INT") ||
            type.includes("DOUBLE") ||
            type.includes("FLOAT") ||
            type.includes("NUM") ||
            name.includes("amount") ||
            name.includes("expenditure") ||
            name.includes("cost") ||
            name.includes("fund")
          );
        }
        if (variableCategory === "identifiers") {
          return (
            name.includes("id") ||
            name.includes("code") ||
            name.includes("lgd") ||
            name.includes("key") ||
            name.includes("pk") ||
            name.includes("fk")
          );
        }
        if (variableCategory === "temporal") {
          return (
            type.includes("DATE") ||
            type.includes("TIME") ||
            name.includes("year") ||
            name.includes("fiscal") ||
            name.includes("month")
          );
        }
        if (variableCategory === "media") {
          return (
            type.includes("IMAGE") ||
            type.includes("VIDEO") ||
            type.includes("HTML") ||
            type.includes("PDF") ||
            type.includes("BINARY") ||
            type.includes("DOCX") ||
            name.includes("photo") ||
            name.includes("video") ||
            name.includes("doc")
          );
        }
        if (variableCategory === "text") {
          return type.includes("VARCHAR") || type.includes("TEXT") || type.includes("STRING");
        }
        return true;
      });
    }

    return vars;
  }, [currentTableItem, inTableSearch, variableCategory]);

  // Check if current table has verified sample rows
  const hasRealSampleRows = useMemo(() => {
    return Boolean(currentTableItem?.table.sampleRows && currentTableItem.table.sampleRows.length > 0);
  }, [currentTableItem]);

  // Generates or retrieves sample rows for any table
  const sampleRowsData = useMemo(() => {
    if (!currentTableItem) return [];
    if (currentTableItem.table.sampleRows && currentTableItem.table.sampleRows.length > 0) {
      return currentTableItem.table.sampleRows;
    }

    // Dynamic fallback generation based on the table's actual schema (explicitly labeled as synthetic)
    const gps = [
      { name: "Andhrua", code: 119598, dist: "Khordha", block: "Bhubaneswar" },
      { name: "Bheden", code: 116438, dist: "Bargarh", block: "Bheden" },
      { name: "Chikilli", code: 117835, dist: "Ganjam", block: "Rangeilunda" },
    ];

    const row1: Record<string, string | number> = {};
    const row2: Record<string, string | number> = {};
    const row3: Record<string, string | number> = {};

    currentTableItem.table.variables.slice(0, 8).forEach((v, idx) => {
      const key = v.name;
      const lower = key.toLowerCase();
      const type = v.type.toUpperCase();

      if (lower.includes("lgd") || lower.includes("gp_code")) {
        row1[key] = gps[0].code;
        row2[key] = gps[1].code;
        row3[key] = gps[2].code;
      } else if (lower.includes("gp_name") || lower.includes("panchayat")) {
        row1[key] = gps[0].name;
        row2[key] = gps[1].name;
        row3[key] = gps[2].name;
      } else if (lower.includes("district")) {
        row1[key] = gps[0].dist;
        row2[key] = gps[1].dist;
        row3[key] = gps[2].dist;
      } else if (lower.includes("year") || lower.includes("fiscal")) {
        row1[key] = "2024-2025";
        row2[key] = "2024-2025";
        row3[key] = "2023-2024";
      } else if (lower.includes("date")) {
        row1[key] = "2024-10-15";
        row2[key] = "2024-11-20";
        row3[key] = "2024-12-05";
      } else if (lower.includes("amount") || lower.includes("expenditure") || lower.includes("cost") || lower.includes("fund")) {
        row1[key] = "₹2,45,000";
        row2[key] = "₹4,80,000";
        row3[key] = "₹1,65,500";
      } else if (lower.includes("id") || lower.includes("code") || lower.includes("no") || lower.includes("pk")) {
        row1[key] = `${key.slice(0, 4).toUpperCase()}_9041`;
        row2[key] = `${key.slice(0, 4).toUpperCase()}_9042`;
        row3[key] = `${key.slice(0, 4).toUpperCase()}_9043`;
      } else if (type.includes("INT") || type.includes("NUM")) {
        row1[key] = (idx + 1) * 14;
        row2[key] = (idx + 1) * 28;
        row3[key] = (idx + 1) * 42;
      } else if (type.includes("DOUBLE") || type.includes("FLOAT")) {
        row1[key] = (idx * 1.5 + 2.5).toFixed(2);
        row2[key] = (idx * 2.0 + 3.0).toFixed(2);
        row3[key] = (idx * 1.2 + 1.8).toFixed(2);
      } else {
        row1[key] = "Sample_Val_A";
        row2[key] = "Sample_Val_B";
        row3[key] = "Sample_Val_C";
      }
    });

    return [row1, row2, row3];
  }, [currentTableItem]);

  // Checks if the current table actually owns unstructured evidence artifacts
  const hasEvidenceArtifacts = useMemo(() => {
    return Boolean(
      currentTableItem?.table.evidenceArtifacts &&
      currentTableItem.table.evidenceArtifacts.length > 0
    );
  }, [currentTableItem]);

  // Retrieve evidence artifacts exclusively for the current table if present
  const currentEvidenceArtifacts: EvidenceArtifact[] = useMemo(() => {
    return currentTableItem?.table.evidenceArtifacts || [];
  }, [currentTableItem]);

  // If active table has no evidence artifacts, automatically fallback viewMode to schema
  useEffect(() => {
    if (viewMode === "evidence" && !hasEvidenceArtifacts) {
      setViewMode("schema");
    }
  }, [hasEvidenceArtifacts, viewMode]);

  // Export current table schema as CSV
  const handleExportCSV = () => {
    if (!currentTableItem) return;
    const t = currentTableItem.table;
    const headers = ["Field Name", "Data Type", "Total Records", "Availability", "Description"];
    const rows = t.variables.map((v) => [
      `"${v.name}"`,
      `"${v.type}"`,
      v.totalRecords,
      `"${v.pctAvailable}"`,
      `"${v.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${t.name}_data_dictionary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to safely quote SQL identifiers following DuckDB / ANSI SQL rules
  const quoteSqlIdentifier = (name: string): string => {
    const sqlKeywords = new Set([
      "SELECT", "FROM", "WHERE", "GROUP", "ORDER", "BY", "LIMIT", "JOIN",
      "ON", "AS", "YEAR", "DATE", "TABLE", "USER", "CASE", "WHEN", "THEN", "ELSE", "END"
    ]);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) || sqlKeywords.has(name.toUpperCase())) {
      return `"${name.replace(/"/g, '""')}"`;
    }
    return name;
  };

  // Copy SQL query snippet with properly escaped table and column identifiers
  const handleCopySQL = () => {
    if (!currentTableItem) return;
    const t = currentTableItem.table;
    const cols = t.variables.slice(0, 6).map((v) => quoteSqlIdentifier(v.name)).join(", ");
    const quotedTable = quoteSqlIdentifier(t.name);
    const sql = `-- Query ${t.name} from Odisha PR&DW Analytical Database\nSELECT ${cols}\nFROM ${quotedTable}\nLIMIT 100;`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Data type badge color mapping
  const getTypeBadgeClass = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("IMAGE") || t.includes("PHOTO")) {
      return "bg-amber-100 text-amber-800 border-amber-300";
    }
    if (t.includes("VIDEO")) {
      return "bg-purple-100 text-purple-800 border-purple-300";
    }
    if (t.includes("HTML") || t.includes("TEXT")) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    }
    if (t.includes("INT") || t.includes("NUM") || t.includes("FLOAT")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
    if (t.includes("DATE") || t.includes("TIME")) {
      return "bg-indigo-100 text-indigo-800 border-indigo-300";
    }
    if (t.includes("BINARY") || t.includes("PDF") || t.includes("DOCX")) {
      return "bg-rose-100 text-rose-800 border-rose-300";
    }
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-ivory">
      {/* Top Banner / Metrics Overview */}
      <div className="bg-white border-b border-line px-5 py-3 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base md:text-lg font-semibold text-ink">
                Metadata Catalogue &amp; Data Dictionary
              </span>
              <Badge variant="outline" className="text-xs bg-teal-deep/5 text-teal-deep border-teal-deep/20 font-medium">
                <ShieldCheck size={12} className="mr-1 text-teal-deep" />
                {catalogData.standards}
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                v{catalogData.version}
              </Badge>
            </div>
            <p className="text-xs text-muted-design mt-0.5 max-w-4xl">
              Authoritative reference catalogue for Odisha rural governance datasets. Audited across 20 pilot Gram Panchayats (multimodal Gram Sabha media, MoMs, and local registers) and all 6,794 GPs statewide (financial planning, vouchers, and core database).
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80 flex-shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-design" />
            <Input
              type="text"
              placeholder="Search 1,900+ variables, columns, or tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs bg-ivory border-line focus-visible:ring-teal-deep"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-muted-design hover:text-ink font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
          <div className="bg-ivory/80 border border-line rounded-lg p-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <Layers size={14} />
            </div>
            <div>
              <div className="text-[11px] text-muted-design font-medium leading-none">Audited Datasets</div>
              <div className="text-xs font-semibold text-ink mt-0.5">{catalogData.totalDatasets} Domains</div>
            </div>
          </div>

          <div className="bg-ivory/80 border border-line rounded-lg p-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <Database size={14} />
            </div>
            <div>
              <div className="text-[11px] text-muted-design font-medium leading-none">Total Records</div>
              <div className="text-xs font-semibold text-ink mt-0.5">{catalogData.totalRecords}</div>
            </div>
          </div>

          <div className="bg-ivory/80 border border-line rounded-lg p-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <TableIcon size={14} />
            </div>
            <div>
              <div className="text-[11px] text-muted-design font-medium leading-none">Indexed Tables &amp; Vars</div>
              <div className="text-xs font-semibold text-ink mt-0.5">{catalogData.totalTables} Tables • {catalogData.totalVariables} Vars</div>
            </div>
          </div>

          <div className="bg-ivory/80 border border-line rounded-lg p-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <Camera size={14} />
            </div>
            <div>
              <div className="text-[11px] text-muted-design font-medium leading-none">Scope Architecture</div>
              <div className="text-xs font-semibold text-ink mt-0.5">20 Pilot GPs + Statewide</div>
            </div>
          </div>
        </div>

        {/* Dataset Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-none" role="tablist" aria-label="Dataset filters">
          <button
            data-testid="filter-all"
            onClick={() => {
              setSelectedDatasetId("all");
              setSelectedTableRef(null);
              setSidebarFilter("");
              setViewMode("schema");
            }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              selectedDatasetId === "all"
                ? "bg-teal-deep text-white shadow-sm"
                : "bg-ivory text-muted-design hover:text-ink hover:bg-ivory/90 border border-line"
            }`}
          >
            All Datasets ({catalogData.totalTables})
          </button>

          {datasets.map((d) => (
            <button
              key={d.id}
              data-testid={`filter-${d.id}`}
              onClick={() => {
                setSelectedDatasetId(d.id);
                setSelectedTableRef(null);
                setSidebarFilter("");
                setViewMode("schema");
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedDatasetId === d.id
                  ? "bg-teal-deep text-white shadow-sm"
                  : "bg-ivory text-muted-design hover:text-ink hover:bg-ivory/90 border border-line"
              }`}
            >
              <span>{d.shortName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedDatasetId === d.id ? "bg-white/20 text-white" : "bg-line text-muted-design"
                }`}
              >
                {d.tables.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* If Search Query is Active: Show Search Results */}
        {searchResults ? (
          <div className="flex-1 min-h-0 p-5 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-ink">
                  Found <span className="font-semibold text-teal-deep">{searchResults.length}</span> matching variables for{" "}
                  <span className="italic">"{searchQuery}"</span>
                </div>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-teal-deep hover:underline font-medium"
                >
                  Exit Search
                </button>
              </div>

              <div className="bg-white border border-line rounded-lg shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-ivory/95 sticky top-0 z-10 border-b border-line shadow-xs">
                    <TableRow>
                      <TableHead className="w-40 text-xs">Dataset</TableHead>
                      <TableHead className="w-48 text-xs">Table Name</TableHead>
                      <TableHead className="w-44 text-xs">Variable</TableHead>
                      <TableHead className="w-32 text-xs">Data Type</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="w-24 text-right text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-design">
                          No variables matched your search query. Try searching for "photo", "attendance", "voucher", or "lgd".
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchResults.slice(0, 100).map((res, idx) => (
                        <TableRow key={`${res.datasetId}-${res.tableName}-${res.variable.name}-${idx}`} className="hover:bg-ivory/30">
                          <TableCell className="text-xs font-medium text-muted-design">{res.datasetName}</TableCell>
                          <TableCell className="text-xs font-semibold text-teal-deep font-mono">{res.tableName}</TableCell>
                          <TableCell className="text-xs font-mono font-medium text-ink">{res.variable.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-mono ${getTypeBadgeClass(res.variable.type)}`}>
                              {res.variable.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-ink/80 leading-relaxed">{res.variable.description}</TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => {
                                setSelectedDatasetId(res.datasetId);
                                setSelectedTableRef({ datasetId: res.datasetId, tableName: res.tableName });
                                setSearchQuery("");
                                setViewMode("schema");
                              }}
                              className="text-[11px] text-teal-deep hover:underline font-medium"
                            >
                              View Table
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Browse Mode */
          <>
            {/* Sidebar: Table Selection List */}
            <div className="w-72 md:w-80 border-r border-line bg-white flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
              <div className="p-2.5 border-b border-line bg-ivory/50 flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                    Tables ({filteredSidebarTables.length})
                  </span>
                  <span className="text-[10px] text-muted-design font-medium">
                    {selectedDatasetId === "all" ? "All Domains" : activeDataset?.shortName}
                  </span>
                </div>
                {/* Search / Filter within sidebar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-design" />
                  <Input
                    type="text"
                    placeholder="Filter tables..."
                    value={sidebarFilter}
                    onChange={(e) => setSidebarFilter(e.target.value)}
                    className="pl-8 pr-6 py-1 text-xs h-7 bg-white border-line focus-visible:ring-teal-deep"
                  />
                  {sidebarFilter && (
                    <button
                      onClick={() => setSidebarFilter("")}
                      className="absolute right-2 top-1.5 text-[10px] text-muted-design hover:text-ink font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable list container with explicit min-h-0 */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {filteredSidebarTables.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-design">
                    No tables matching "{sidebarFilter}"
                  </div>
                ) : (
                  filteredSidebarTables.map(({ datasetId, datasetName, table }) => {
                    const isSelected =
                      currentTableItem?.table.name === table.name &&
                      currentTableItem?.datasetId === datasetId;
                    return (
                      <button
                        key={`${datasetId}-${table.name}`}
                        data-testid={`table-btn-${table.name}`}
                        onClick={() => {
                          setSelectedTableRef({ datasetId, tableName: table.name });
                          setViewMode("schema");
                        }}
                        className={`w-full text-left p-2.5 rounded-md transition-all text-xs flex flex-col gap-1 border ${
                          isSelected
                            ? "bg-teal-deep/10 border-teal-deep/40 text-teal-deep font-medium shadow-xs"
                            : "border-transparent text-ink hover:bg-ivory hover:border-line"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">{table.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ivory border border-line text-muted-design font-mono flex-shrink-0">
                            {table.variables.length} vars
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-design truncate">
                          {selectedDatasetId === "all" ? `${datasetName} • ` : ""}
                          {table.description}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Main Detail Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <div className="max-w-6xl mx-auto space-y-4">
                {/* Header Banner: Distinct Consolidated Repository for "All Datasets", or Specific Domain for Filtered Tabs */}
                {selectedDatasetId === "all" ? (
                  <Card className="border-line bg-white shadow-xs">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold text-ink">
                            All Datasets — Consolidated Governance Repository
                          </CardTitle>
                          <Badge variant="outline" className="text-xs bg-teal-deep/5 text-teal-deep border-teal-deep/20 font-medium">
                            Cross-Domain Catalogue
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                            Statewide Conformance
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-design">
                          <Building2 size={13} className="text-teal-deep" />
                          <span>Panchayati Raj &amp; Drinking Water Department, Odisha</span>
                        </div>
                      </div>
                      <CardDescription className="text-xs text-ink/80 mt-1 leading-relaxed">
                        Consolidated repository integrating all 6 rural governance data domains across Odisha: Master Analytical DB, eGram Swaraj, Panchayat Nirnay, Sabha Saar, ePanchayat Sabha, and Meri Panchayat. Spans statewide financial ledgers, spatial registries, village asset inventories, and multimodal citizen meeting evidence.
                      </CardDescription>

                      {/* Global Overview 3 Metric Cards */}
                      <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-line/40">
                        <div className="bg-ivory/60 border border-line/80 rounded p-1.5 text-center">
                          <div className="text-sm font-bold text-teal-deep font-mono leading-tight">{catalogData.totalRecords}</div>
                          <div className="text-[10px] text-muted-design mt-0.5">Audited Statewide Records</div>
                        </div>
                        <div className="bg-ivory/60 border border-line/80 rounded p-1.5 text-center">
                          <div className="text-sm font-bold text-teal-deep font-mono leading-tight">{catalogData.totalTables} Tables • {catalogData.totalVariables} Vars</div>
                          <div className="text-[10px] text-muted-design mt-0.5">143 Unique Tables • 6 Datasets</div>
                        </div>
                        <div className="bg-ivory/60 border border-line/80 rounded p-1.5 text-center">
                          <div className="text-sm font-bold text-teal-deep font-mono leading-tight">6 Integrated Domains</div>
                          <div className="text-[10px] text-muted-design mt-0.5">Financial, Spatial &amp; Multimodal</div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 border-t border-line/60 mt-1">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                        <div className="flex items-start gap-2">
                          <Info size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-ink">Catalogue Scope: </span>
                            <span className="text-muted-design">
                              Provides a single unified taxonomy and data dictionary connecting citizen meeting discussions, Panchayat resolutions, financial outlays, and scheme outcomes.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <KeyRound size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-ink">Cross-Domain Linkages: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {["gp_lgd_code", "block_lgd_code", "district_lgd_code", "meeting_id", "voucher_id", "activity_code"].map((id) => (
                                <span key={id} className="font-mono text-[10px] bg-ivory px-1.5 py-0.5 rounded border border-line text-ink">
                                  {id}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-ink">Statewide Architecture: </span>
                            <span className="text-muted-design">
                              All 30 Districts, 314 Blocks &amp; 6,794 GPs statewide + 20 Pilot GPs multimodal in-depth artifacts (FY 2020-21 to FY 2025-26).
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  activeDataset && (
                    <Card className="border-line bg-white shadow-xs">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold text-ink">
                              {activeDataset.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs bg-teal-deep/5 text-teal-deep border-teal-deep/20 font-medium">
                              {activeDataset.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-design">
                            <Building2 size={13} className="text-teal-deep" />
                            <span>{activeDataset.administrativeSource}</span>
                          </div>
                        </div>
                        <CardDescription className="text-xs text-ink/80 mt-1 leading-relaxed">
                          {activeDataset.description}
                        </CardDescription>

                        {/* Display dataset key metric cards */}
                        <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-line/40">
                          {activeDataset.cards.map((c, i) => (
                            <div key={i} className="bg-ivory/60 border border-line/80 rounded p-1.5 text-center">
                              <div className="text-sm font-bold text-teal-deep font-mono leading-tight">{c.metric}</div>
                              <div className="text-[10px] text-muted-design mt-0.5">{c.title}</div>
                            </div>
                          ))}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 border-t border-line/60 mt-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Info size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium text-ink">Purpose: </span>
                              <span className="text-muted-design">{activeDataset.purpose}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <KeyRound size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium text-ink">Foreign Keys: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {activeDataset.identifiers.map((id) => (
                                  <span key={id} className="font-mono text-[10px] bg-ivory px-1.5 py-0.5 rounded border border-line text-ink">
                                    {id}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium text-ink">Coverage: </span>
                              <span className="text-muted-design">{activeDataset.geographicCoverage} • Timeframe: {activeDataset.temporalCoverage}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}

                {/* Selected Table Detail Card with Interactive Features */}
                {currentTableItem ? (
                  <Card className="border-line bg-white shadow-xs">
                    <CardHeader className="p-4 border-b border-line space-y-3">
                      {/* Title & Quick Actions Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-mono font-semibold text-teal-deep">
                              {currentTableItem.table.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs bg-ivory border-line text-muted-design">
                              {currentTableItem.table.variables.length} Variables
                            </Badge>
                          </div>
                          <CardDescription className="text-xs text-muted-design mt-1">
                            {currentTableItem.table.description}
                          </CardDescription>
                        </div>

                        {/* Quick Utility Tools: CSV Export & Copy SQL */}
                        <div className="flex items-center gap-2">
                          <button
                            data-testid="btn-copy-sql"
                            onClick={handleCopySQL}
                            title="Copy sample SQL query to clipboard"
                            className="px-2.5 py-1 text-xs font-medium rounded border border-line bg-ivory text-ink hover:bg-ivory/80 flex items-center gap-1.5 transition-all"
                          >
                            {copiedSql ? (
                              <>
                                <Check size={13} className="text-emerald-700" />
                                <span className="text-emerald-700 font-semibold">Copied SQL!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} className="text-muted-design" />
                                <span>Copy SQL</span>
                              </>
                            )}
                          </button>

                          <button
                            data-testid="btn-export-csv"
                            onClick={handleExportCSV}
                            title="Download table dictionary as CSV"
                            className="px-2.5 py-1 text-xs font-medium rounded border border-teal-deep/30 bg-teal-deep/5 text-teal-deep hover:bg-teal-deep/10 flex items-center gap-1.5 transition-all"
                          >
                            <Download size={13} />
                            <span>Export CSV</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive View Mode Selector: Schema vs Sample Data vs Evidence Artifacts */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/50">
                        <div className="flex items-center gap-1 bg-ivory/80 p-0.5 rounded-lg border border-line">
                          <button
                            data-testid="viewmode-schema"
                            onClick={() => setViewMode("schema")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                              viewMode === "schema"
                                ? "bg-white text-teal-deep shadow-xs font-semibold"
                                : "text-muted-design hover:text-ink"
                            }`}
                          >
                            <FileText size={13} />
                            <span>Schema Dictionary ({currentTableItem.table.variables.length})</span>
                          </button>

                          <button
                            data-testid="viewmode-sample"
                            onClick={() => setViewMode("sample")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                              viewMode === "sample"
                                ? "bg-white text-teal-deep shadow-xs font-semibold"
                                : "text-muted-design hover:text-ink"
                            }`}
                          >
                            <TableIcon size={13} />
                            <span>Sample Data Preview ({hasRealSampleRows ? `${sampleRowsData.length} Rows` : "Synthetic Preview"})</span>
                          </button>

                          {hasEvidenceArtifacts && (
                            <button
                              data-testid="viewmode-evidence"
                              onClick={() => setViewMode("evidence")}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                                viewMode === "evidence"
                                  ? "bg-white text-teal-deep shadow-xs font-semibold"
                                  : "text-muted-design hover:text-ink"
                              }`}
                            >
                              <Camera size={13} />
                              <span>Evidence Artifacts ({currentEvidenceArtifacts.length})</span>
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-design font-medium">
                          Dataset: <span className="text-ink font-semibold">{currentTableItem.datasetName}</span>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Mode 1: Schema Dictionary View */}
                    {viewMode === "schema" && (
                      <CardContent className="p-0">
                        {/* In-Table Filter & Search Controls */}
                        <div className="p-3 bg-ivory/40 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {/* Category Filter Chips */}
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                            {[
                              { id: "all", label: "All Columns" },
                              { id: "financial", label: "Financial / Numbers" },
                              { id: "identifiers", label: "Codes & IDs" },
                              { id: "temporal", label: "Dates" },
                              { id: "text", label: "Text / Labels" },
                              { id: "media", label: "Media / Docs" },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                data-testid={`filter-cat-${cat.id}`}
                                onClick={() => setVariableCategory(cat.id)}
                                className={`px-2.5 py-1 text-[11px] rounded transition-all font-medium whitespace-nowrap ${
                                  variableCategory === cat.id
                                    ? "bg-teal-deep text-white shadow-xs"
                                    : "bg-white border border-line text-muted-design hover:text-ink hover:bg-ivory"
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          {/* Quick Column Search */}
                          <div className="relative w-full sm:w-56 flex-shrink-0">
                            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-design" />
                            <Input
                              type="text"
                              placeholder="Search columns..."
                              value={inTableSearch}
                              onChange={(e) => setInTableSearch(e.target.value)}
                              className="pl-8 pr-2 py-0.5 text-xs h-7 bg-white border-line focus-visible:ring-teal-deep"
                            />
                            {inTableSearch && (
                              <button
                                onClick={() => setInTableSearch("")}
                                className="absolute right-2 top-1 text-[10px] text-muted-design hover:text-ink"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Variables Table */}
                        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-ivory/95 backdrop-blur z-10 border-b border-line shadow-xs">
                              <TableRow>
                                <TableHead className="w-52 text-xs font-semibold text-ink">Field Name</TableHead>
                                <TableHead className="w-36 text-xs font-semibold text-ink">Data Type</TableHead>
                                <TableHead className="w-28 text-right text-xs font-semibold text-ink">Total Records</TableHead>
                                <TableHead className="w-36 text-xs font-semibold text-ink">Completeness Gauge</TableHead>
                                <TableHead className="text-xs font-semibold text-ink">Description &amp; Standards Note</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {displayedVariables.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-design">
                                    No variables match your current column filters.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                displayedVariables.map((variable, idx) => {
                                  const pctVal = parseFloat(variable.pctAvailable) || 100;
                                  return (
                                    <TableRow key={`${variable.name}-${idx}`} className="hover:bg-ivory/40">
                                      <TableCell className="font-mono text-xs font-medium text-ink">
                                        {variable.name}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className={`text-[10px] font-mono border ${getTypeBadgeClass(variable.type)}`}>
                                          {variable.type}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right text-xs text-muted-design font-mono">
                                        {variable.totalRecords.toLocaleString()}
                                      </TableCell>
                                      {/* Interactive Visual Completeness Gauge */}
                                      <TableCell>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center justify-between text-[11px] font-mono">
                                            <span className={pctVal >= 99 ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                                              {variable.pctAvailable}
                                            </span>
                                            <span className="text-[10px] text-muted-design">
                                              {pctVal >= 99 ? "Complete" : "Partial"}
                                            </span>
                                          </div>
                                          <div className="w-full bg-line/60 h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                pctVal >= 95 ? "bg-emerald-600" : pctVal >= 80 ? "bg-amber-500" : "bg-rose-500"
                                              }`}
                                              style={{ width: `${pctVal}%` }}
                                            />
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-xs text-ink/80 leading-relaxed">
                                        {variable.description}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    )}

                    {/* Mode 2: Sample Data Preview View */}
                    {viewMode === "sample" && (
                      <CardContent className="p-4 space-y-3">
                        {hasRealSampleRows ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-muted-design">
                              <Sparkles size={14} className="text-teal-deep" />
                              <span>Representative sample rows extracted from {currentTableItem.table.name} data records.</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-teal-deep/5 text-teal-deep border-teal-deep/20 font-medium">
                              {sampleRowsData.length} Representative Rows
                            </Badge>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-md text-xs flex items-start gap-2.5 text-amber-900">
                              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="space-y-0.5">
                                <div className="font-semibold text-amber-950">Synthetic Schema Preview</div>
                                <div className="text-amber-800 leading-relaxed">
                                  No raw sample rows are supplied in the catalogue payload for this table. The preview below displays synthetic values synthesized from column data types to illustrate schema structure and formatting. They are not audited or real data records.
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="text-[11px] text-muted-design italic">
                                Synthetic fallback rows based on schema types:
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-medium">
                                Synthetic Preview ({sampleRowsData.length} Rows)
                              </Badge>
                            </div>
                          </div>
                        )}

                        <div className="border border-line rounded-lg overflow-x-auto bg-white shadow-xs">
                          <Table>
                            <TableHeader className="bg-ivory/80">
                              <TableRow>
                                {Object.keys(sampleRowsData[0] || {}).map((colName) => (
                                  <TableHead key={colName} className="text-xs font-semibold text-ink font-mono whitespace-nowrap">
                                    {colName}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sampleRowsData.map((row, rowIdx) => (
                                <TableRow key={rowIdx} className="hover:bg-ivory/30">
                                  {Object.entries(row).map(([k, v], cellIdx) => (
                                    <TableCell key={`${k}-${cellIdx}`} className="text-xs font-mono text-ink/90 whitespace-nowrap py-2.5">
                                      {String(v)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    )}

                    {/* Mode 3: Evidence Artifacts Gallery */}
                    {viewMode === "evidence" && (
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-ink">Multimodal Governance Artifacts</span>
                            <p className="text-[11px] text-muted-design">
                              Representative pilot evidence specimens demonstrating data extraction and multimodal validation schemas for 20 pilot Gram Panchayats. Click any card to inspect artifact details.
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-teal-deep/5 text-teal-deep border-teal-deep/20 font-medium">
                            20 Pilot GPs Scope
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {currentEvidenceArtifacts.map((artifact, artIdx) => (
                            <div
                              key={artIdx}
                              data-testid={`evidence-card-${artIdx}`}
                              onClick={() => setInspectedArtifact(artifact)}
                              className="border border-line rounded-lg p-3.5 bg-ivory/40 hover:bg-ivory/90 hover:border-teal-deep/40 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-2xs group"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-mono ${
                                      artifact.type === "IMAGE"
                                        ? "bg-amber-100 text-amber-800 border-amber-300"
                                        : artifact.type === "VIDEO"
                                        ? "bg-purple-100 text-purple-800 border-purple-300"
                                        : "bg-blue-100 text-blue-800 border-blue-300"
                                    }`}
                                  >
                                    {artifact.type}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-muted-design">{artifact.fileSize}</span>
                                </div>

                                <div className="text-xs font-semibold text-ink group-hover:text-teal-deep transition-colors line-clamp-1">
                                  {artifact.title}
                                </div>

                                <p className="text-[11px] text-muted-design leading-relaxed line-clamp-2">
                                  {artifact.description}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[10px] text-muted-design">
                                <span className="font-medium text-ink">{artifact.gpName}</span>
                                <div className="flex items-center gap-1 text-teal-deep font-medium group-hover:underline">
                                  <Eye size={12} />
                                  <span>Inspect</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ) : (
                  <div className="text-center py-12 text-sm text-muted-design">
                    Please select a table from the sidebar to inspect its schema.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Evidence Artifact Inspector Modal */}
      {inspectedArtifact && (
        <div
          data-testid="evidence-modal-backdrop"
          onClick={() => setInspectedArtifact(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            data-testid="evidence-modal-content"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-line shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-line flex items-center justify-between bg-ivory/60">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs font-mono ${
                    inspectedArtifact.type === "IMAGE"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : inspectedArtifact.type === "VIDEO"
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  {inspectedArtifact.type}
                </Badge>
                <span className="font-display text-sm font-semibold text-ink">
                  {inspectedArtifact.title}
                </span>
              </div>
              <button
                data-testid="btn-close-modal"
                onClick={() => setInspectedArtifact(null)}
                className="w-7 h-7 rounded-md hover:bg-line/60 text-muted-design hover:text-ink flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Simulated Artifact Display Canvas */}
              <div className="border border-line rounded-lg p-5 bg-ivory/40 flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]">
                {inspectedArtifact.type === "IMAGE" ? (
                  <div className="w-full bg-white border border-line/80 rounded-md p-4 shadow-xs text-left space-y-2">
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="text-[11px] font-bold text-ink uppercase tracking-wide">
                        Government of Odisha • Panchayati Raj &amp; Drinking Water
                      </span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">Representative Specimen</span>
                    </div>
                    <div className="text-xs font-semibold text-ink">{inspectedArtifact.gpName}</div>
                    <div className="text-[11px] text-muted-design font-mono leading-relaxed bg-ivory/80 p-2.5 rounded border border-line/60">
                      {inspectedArtifact.contentSnippet}
                    </div>
                    <div className="text-[10px] text-muted-design flex items-center justify-between pt-1">
                      <span>Recorded Date: {inspectedArtifact.date}</span>
                      <span className="text-muted-design font-medium">Demonstration schema extraction format</span>
                    </div>
                  </div>
                ) : inspectedArtifact.type === "HTML" ? (
                  <div className="w-full bg-white border border-line/80 rounded-md p-4 shadow-xs text-left space-y-2 font-serif">
                    <div className="text-xs font-bold text-teal-deep font-sans border-b border-line/60 pb-1 flex items-center justify-between">
                      <span>Digitized Proceedings (MoM)</span>
                      <span className="text-[10px] font-mono text-muted-design font-sans">{inspectedArtifact.date}</span>
                    </div>
                    <div className="text-xs text-ink/90 leading-relaxed bg-ivory/50 p-3 rounded font-sans border border-line/40">
                      {inspectedArtifact.contentSnippet}
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-slate-900 text-white rounded-md p-5 flex flex-col items-center justify-center space-y-2 shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-teal-deep mb-1">
                      <Video size={24} className="text-teal-400" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-200">Audiovisual Proceeding Stream</span>
                    <span className="text-[11px] text-slate-400">{inspectedArtifact.contentSnippet}</span>
                  </div>
                )}
              </div>

              {/* Metadata Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-line">
                <div>
                  <span className="text-muted-design text-[11px]">Gram Panchayat:</span>
                  <div className="font-semibold text-ink mt-0.5">{inspectedArtifact.gpName}</div>
                </div>
                <div>
                  <span className="text-muted-design text-[11px]">District:</span>
                  <div className="font-semibold text-ink mt-0.5">{inspectedArtifact.district}</div>
                </div>
                <div>
                  <span className="text-muted-design text-[11px]">Recording Date:</span>
                  <div className="font-semibold text-ink mt-0.5">{inspectedArtifact.date}</div>
                </div>
                <div>
                  <span className="text-muted-design text-[11px]">File Format &amp; Size:</span>
                  <div className="font-mono text-ink mt-0.5">{inspectedArtifact.fileSize}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-design text-[11px]">Audit Classification:</span>
                  <div className="text-ink mt-0.5 text-[11px] leading-relaxed">{inspectedArtifact.description}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-line bg-ivory/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-design">
                Adheres to National Metadata Standards (NMDS 2.0)
              </span>
              <button
                onClick={() => setInspectedArtifact(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-deep text-white hover:bg-teal-deep/90 transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CatalogueView;
