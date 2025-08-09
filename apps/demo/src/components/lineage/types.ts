import type {
  ColumnLineageDatasetFacet,
  Transformation,
} from "@meta-sql/open-lineage";

// Use the actual return type from getLineage
export type LineageResult = ColumnLineageDatasetFacet["fields"];

export interface LineageGraphProps {
  lineageData: LineageResult;
  className?: string;
}

export type ColumnType = "source" | "target" | "unused";

export interface ColumnData {
  name: string;
  type: ColumnType;
  transformation?: Transformation;
}

export type TableType = "source" | "target";

export interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  columns: ColumnData[];
  type: TableType;
}
