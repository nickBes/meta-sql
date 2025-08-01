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

export interface ColumnData {
  name: string;
  type: "source" | "target" | "unused";
  transformation?: Transformation;
}

export interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  columns: ColumnData[];
  type: "source" | "target";
}
