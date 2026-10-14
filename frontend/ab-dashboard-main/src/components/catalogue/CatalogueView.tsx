import React, { useState, useMemo } from "react";
import catalogPayload from "@/data/metadataCatalog.json";
import type { MetadataCatalogPayload, DatasetCatalog, TableSchema, VariableSchema } from "@/types/catalogue";
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
  KeyRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [selectedTableName, setSelectedTableName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Automatically select the first table if none selected or if selection is invalid
  const currentTableItem = useMemo(() => {
    if (selectedTableName) {
      const match = availableTables.find((item) => item.table.name === selectedTableName);
      if (match) return match;
    }
    return availableTables[0];
  }, [availableTables, selectedTableName]);

  // Filtered variables based on search query
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-ivory">
      {/* Top Banner / Metrics Overview */}
      <div className="bg-white border-b border-line px-6 py-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold text-ink">
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
            <p className="text-xs text-muted-design mt-1">
              Authoritative reference catalogue for Odisha rural governance datasets, spanning structured DuckDB outlays and multimodal Gram Sabha media.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
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
                className="absolute right-2.5 top-2.5 text-xs text-muted-design hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-ivory/70 border border-line rounded-lg p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <div className="text-xs text-muted-design font-medium">Audited Datasets</div>
              <div className="text-sm font-semibold text-ink">{catalogData.totalDatasets} Domains</div>
            </div>
          </div>

          <div className="bg-ivory/70 border border-line rounded-lg p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <TableIcon size={16} />
            </div>
            <div>
              <div className="text-xs text-muted-design font-medium">Indexed Tables</div>
              <div className="text-sm font-semibold text-ink">{catalogData.totalTables} Schemas</div>
            </div>
          </div>

          <div className="bg-ivory/70 border border-line rounded-lg p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <div className="text-xs text-muted-design font-medium">Standardized Variables</div>
              <div className="text-sm font-semibold text-ink">{catalogData.totalVariables} Fields</div>
            </div>
          </div>

          <div className="bg-ivory/70 border border-line rounded-lg p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-teal-deep/10 text-teal-deep flex items-center justify-center flex-shrink-0">
              <Camera size={16} />
            </div>
            <div>
              <div className="text-xs text-muted-design font-medium">Unstructured Evidence</div>
              <div className="text-sm font-semibold text-ink">Photos, MoMs, Video</div>
            </div>
          </div>
        </div>

        {/* Dataset Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Dataset filters">
          <button
            data-testid="filter-all"
            onClick={() => {
              setSelectedDatasetId("all");
              setSelectedTableName("");
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
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
                setSelectedTableName("");
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
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
      <div className="flex-1 flex overflow-hidden">
        {/* If Search Query is Active: Show Search Results */}
        {searchResults ? (
          <div className="flex-1 p-6 overflow-y-auto">
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
                  Back to Catalogue Browse
                </button>
              </div>

              <div className="bg-white border border-line rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-ivory/60">
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
                          <TableCell className="text-xs font-semibold text-teal-deep">{res.tableName}</TableCell>
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
                                setSelectedTableName(res.tableName);
                                setSearchQuery("");
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
            <div className="w-72 md:w-80 border-r border-line bg-white flex flex-col flex-shrink-0 overflow-hidden">
              <div className="p-3 border-b border-line bg-ivory/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Tables ({availableTables.length})
                </span>
                <span className="text-[10px] text-muted-design">
                  {selectedDatasetId === "all" ? "All Domains" : activeDataset?.shortName}
                </span>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {availableTables.map(({ datasetName, table }) => {
                    const isSelected = currentTableItem?.table.name === table.name;
                    return (
                      <button
                        key={`${datasetName}-${table.name}`}
                        data-testid={`table-btn-${table.name}`}
                        onClick={() => setSelectedTableName(table.name)}
                        className={`w-full text-left p-2.5 rounded-md transition-all text-xs flex flex-col gap-1 border ${
                          isSelected
                            ? "bg-teal-deep/5 border-teal-deep/30 text-teal-deep font-medium shadow-sm"
                            : "border-transparent text-ink hover:bg-ivory hover:border-line"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{table.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ivory border border-line text-muted-design font-mono">
                            {table.variables.length} vars
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-design truncate">
                          {selectedDatasetId === "all" ? `${datasetName} • ` : ""}
                          {table.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Main Detail Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Dataset Meta Banner (if specific dataset selected) */}
                {activeDataset && (
                  <Card className="border-line bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold text-ink">
                            {activeDataset.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs bg-teal-deep/5 text-teal-deep border-teal-deep/20">
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
                    </CardHeader>

                    <CardContent className="pt-0 border-t border-line/60 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
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
                            <span className="text-muted-design">{activeDataset.geographicCoverage} ({activeDataset.temporalCoverage})</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected Table Detail */}
                {currentTableItem ? (
                  <Card className="border-line bg-white shadow-sm">
                    <CardHeader className="pb-3 border-b border-line">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

                        <div className="text-xs text-muted-design font-medium">
                          Dataset: <span className="text-ink font-semibold">{currentTableItem.datasetName}</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-ivory/60">
                          <TableRow>
                            <TableHead className="w-48 text-xs font-semibold text-ink">Field Name</TableHead>
                            <TableHead className="w-36 text-xs font-semibold text-ink">Data Type</TableHead>
                            <TableHead className="w-28 text-right text-xs font-semibold text-ink">Total Records</TableHead>
                            <TableHead className="w-28 text-right text-xs font-semibold text-ink">Availability</TableHead>
                            <TableHead className="text-xs font-semibold text-ink">Description &amp; Standards Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentTableItem.table.variables.map((variable, idx) => (
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
                              <TableCell className="text-right text-xs font-mono">
                                <span className={variable.pctAvailable === "100.0%" ? "text-emerald-700 font-medium" : "text-muted-design"}>
                                  {variable.pctAvailable}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-ink/80 leading-relaxed">
                                {variable.description}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
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
    </div>
  );
}

export default CatalogueView;
