export interface VariableSchema {
  name: string;
  type: string;
  totalRecords: number;
  available: number;
  pctAvailable: string;
  missing: number;
  description: string;
}

export interface EvidenceArtifact {
  title: string;
  type: "IMAGE" | "PDF" | "HTML" | "VIDEO";
  gpName: string;
  district: string;
  date: string;
  fileSize: string;
  description: string;
  previewUrl?: string;
  contentSnippet?: string;
}

export interface TableSchema {
  name: string;
  description: string;
  totalRecords?: number;
  variables: VariableSchema[];
  sampleRows?: Record<string, string | number>[];
  evidenceArtifacts?: EvidenceArtifact[];
}

export interface DatasetMetricCard {
  title: string;
  metric: string;
}

export interface DatasetCatalog {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  administrativeSource: string;
  purpose: string;
  unitOfObservation: string;
  geographicCoverage: string;
  temporalCoverage: string;
  identifiers: string[];
  architecture: string;
  tags: string[];
  cards: DatasetMetricCard[];
  totalTables: number;
  totalVariables: number;
  tables: TableSchema[];
}

export interface MetadataCatalogPayload {
  totalDatasets: number;
  totalTables: number;
  totalVariables: number;
  totalRecords: string;
  totalRecordsExact?: number;
  pilotScope?: string;
  statewideScope?: string;
  standards: string;
  version: string;
  updatedAt: string;
  governingBody: string;
  datasets: DatasetCatalog[];
}
