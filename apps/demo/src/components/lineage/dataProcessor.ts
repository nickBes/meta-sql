import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { DIRECT_IDENTITY, type Schema } from "@meta-sql/lineage";
import type { LineageResult, TableNodeData, ColumnData } from "./types";
import type { Transformation } from "@meta-sql/open-lineage";
import { getEdgeStyle } from "./edgeUtils";

interface ParsedLineageData {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
}

export const extractDirectTransformation = (
  transformations: Transformation[]
): Transformation | null => {
  let agg: Transformation | undefined;
  let t: Transformation | undefined;

  for (const transformation of transformations) {
    if (transformation.type !== "DIRECT") {
      return null;
    }

    switch (transformation.subtype) {
      case "AGGREGATION":
        agg = transformation;
        break;
      case "TRANSFORMATION":
        t = transformation;
        break;
    }
  }

  return agg ?? t ?? DIRECT_IDENTITY;
};

export const parseLineageData = (
  lineageData: LineageResult,
  schema?: Schema
): ParsedLineageData => {
  const TABLE_WIDTH = 350;
  const COLUMN_HEIGHT = 40;
  const SPACING = 200;

  const edges: Edge[] = [];
  const [sourceNodes] = (schema?.tables ?? []).reduce(
    ([acc, height], table) => {
      acc[table.name] = {
        id: table.name,
        type: "table",
        position: { x: 0, y: height },
        data: {
          tableName: table.name,
          columns: table.columns.map((col) => ({ name: col, type: "unused" })),
          type: "source",
        },
      };

      return [
        acc,
        height + SPACING + table.columns.length * COLUMN_HEIGHT,
      ] as const;
    },
    [{}, 0] as [Record<string, Node<TableNodeData>>, number]
  );

  const targetNode: Node<TableNodeData> = {
    id: "result",
    type: "table",
    position: { x: TABLE_WIDTH + SPACING, y: 0 },
    data: {
      tableName: "result",
      columns: [],
      type: "target",
    },
  };

  Object.entries(lineageData).forEach(([outputFieldName, lineage]) => {
    const outputTransformations: Transformation[] = [];

    lineage.inputFields.forEach((field) => {
      const transformation = field.transformations
        ? extractDirectTransformation(field.transformations)
        : null;

      if (transformation) {
        outputTransformations.push(transformation);

        const { color, strokeDasharray, strokeWidth, animated } =
          getEdgeStyle(transformation);

        edges.push({
          id: `${field.name}.${field.field}[${transformation.subtype ?? transformation.type}]${outputFieldName}`,
          type: "custom",
          source: `${field.name}`,
          target: `result`,
          sourceHandle: `${field.name}.${field.field}`,
          targetHandle: `result.${outputFieldName}`,
          animated,
          style: {
            strokeWidth,
            stroke: color,
            strokeDasharray,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color,
          },
          data: {
            label: `${field.field} → ${outputFieldName}`,
          },
        });
      }

      if (sourceNodes[field.name]) {
        sourceNodes[field.name]!.data.columns = sourceNodes[
          field.name
        ]!.data.columns.reduce((acc, column) => {
          if (column.name === field.field) {
            acc.push({ ...column, type: "source" });
          } else {
            acc.push(column);
          }
          return acc;
        }, [] as ColumnData[]);
      }
    });

    const outputTransformation = extractDirectTransformation(
      outputTransformations
    );

    targetNode.data.columns.push({
      name: outputFieldName,
      type: "target",
      transformation: outputTransformation ?? undefined,
    });
  });

  return { edges, nodes: [targetNode, ...Object.values(sourceNodes)] };
};
