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

export interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  columns: {
    name: string;
    type: "source" | "target" | "both" | "unused";
    dataType?: string;
    transformation?: Transformation;
  }[];
  type: "source" | "target" | "mixed";
}

export interface ColumnData {
  type: "source" | "target" | "both" | "unused";
  dataType?: string;
  transformation?: Transformation;
}

export interface TableData {
  columns: Map<string, ColumnData>;
  isSource: boolean;
  isTarget: boolean;
}
