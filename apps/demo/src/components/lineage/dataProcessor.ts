import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { Schema } from "@meta-sql/lineage";
import type { LineageResult, TableNodeData, ColumnData } from "./types";
import type { Transformation } from "@meta-sql/open-lineage";
import { getEdgeStyle } from "./edgeUtils";

interface ParsedLineageData {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
}

interface TableData {
  columns: Map<string, Omit<ColumnData, "name">>;
  isSource: boolean;
  isTarget: boolean;
}

export const parseLineageData = (
  lineageData: LineageResult,
  schema?: Schema,
  animateEdges: boolean = true
): ParsedLineageData => {
  const nodes: Node<TableNodeData>[] = [];
  const edges: Edge[] = [];

  // Group columns by table and track their lineage relationships
  const tablesData = new Map<string, TableData>();

  // Create edge map to track unique edges
  const edgeMap = new Map<string, Edge>();
  let edgeIndex = 0;

  // First: Always populate source tables from schema if available
  if (schema) {
    schema.tables.forEach((table) => {
      tablesData.set(table.name, {
        columns: new Map(
          table.columns.map((columnName) => [
            columnName,
            {
              type: "source",
            },
          ])
        ),
        isSource: true,
        isTarget: false,
      });
    });
  }

  // If no lineage data, just return source tables from schema
  if (!lineageData || Object.keys(lineageData).length === 0) {
    // Create nodes for source tables only
    const sourceX = 50;
    let currentSourceY = 50;
    const tableVerticalSpacing = 350;

    tablesData.forEach((tableData, tableName) => {
      const columns = Array.from(tableData.columns.entries()).map(
        ([colName, colData]) => ({
          name: colName,
          type: colData.type,
          transformation: colData.transformation,
        })
      );

      // Sort columns alphabetically
      columns.sort((a, b) => a.name.localeCompare(b.name));

      const tableHeight = Math.max(200, columns.length * 30 + 100);
      const spacing = Math.max(tableVerticalSpacing, tableHeight + 50);

      const tableNode: Node<TableNodeData> = {
        id: tableName,
        type: "table",
        position: { x: sourceX, y: currentSourceY },
        data: {
          tableName,
          columns,
          type: "source",
        },
        draggable: true,
        selectable: true,
      };

      nodes.push(tableNode);
      currentSourceY += spacing;
    });

    return { nodes, edges: [] };
  }

  // Process lineage data and update existing source tables
  Object.entries(lineageData).forEach(([targetColumn, fieldLineage]) => {
    // Parse target column
    const targetParts = targetColumn.includes(".")
      ? targetColumn.split(".", 2)
      : ["result", targetColumn];
    const targetTable = targetParts[0] || "result";
    const targetCol = targetParts[1] || targetColumn;

    // Initialize target table if not exists
    if (!tablesData.has(targetTable)) {
      tablesData.set(targetTable, {
        columns: new Map(),
        isSource: false,
        isTarget: false,
      });
    }

    const targetTableData = tablesData.get(targetTable)!;
    targetTableData.isTarget = true;

    // Mark target column and collect transformation info
    const existingTargetCol = targetTableData.columns.get(targetCol);

    // Collect transformation info from input fields for this target column
    let transformationInfo: Transformation | undefined;
    if (
      fieldLineage &&
      fieldLineage.inputFields &&
      Array.isArray(fieldLineage.inputFields)
    ) {
      // Use the first transformation found (could be enhanced to merge multiple transformations)
      const firstInputWithTransformation = fieldLineage.inputFields.find(
        (inputField) =>
          inputField.transformations && inputField.transformations.length > 0
      );
      if (
        firstInputWithTransformation &&
        firstInputWithTransformation.transformations
      ) {
        const transformation = firstInputWithTransformation.transformations[0];
        if (transformation) {
          transformationInfo = transformation;
        }
      }
    }

    if (existingTargetCol) {
      // Update transformation info if we have new information
      if (transformationInfo) {
        existingTargetCol.transformation = transformationInfo;
      }
    } else {
      targetTableData.columns.set(targetCol, {
        type: "target",
        transformation: transformationInfo,
      });
    }

    // Process source columns and update existing source tables
    if (
      fieldLineage &&
      fieldLineage.inputFields &&
      Array.isArray(fieldLineage.inputFields)
    ) {
      fieldLineage.inputFields.forEach((inputField) => {
        if (!inputField || !inputField.field) return;

        // Use the 'name' field for table name and 'field' for column name
        const sourceTable = inputField.name || "unknown";
        const sourceCol = inputField.field;

        // Update existing source table or create if it doesn't exist
        if (!tablesData.has(sourceTable)) {
          tablesData.set(sourceTable, {
            columns: new Map(),
            isSource: false,
            isTarget: false,
          });
        }

        const sourceTableData = tablesData.get(sourceTable)!;
        sourceTableData.isSource = true;

        // Update source column status (mark as used in lineage)
        const existingSourceCol = sourceTableData.columns.get(sourceCol);
        if (existingSourceCol) {
          // Keep existing type, column is already processed
        } else {
          // This shouldn't happen if schema was loaded first, but handle it
          sourceTableData.columns.set(sourceCol, { type: "source" });
        }

        // Create edge directly if valid connection and not self-reference
        if (sourceTable !== targetTable) {
          const edgeKey = `${sourceTable}.${sourceCol}->${targetTable}.${targetCol}`;

          if (!edgeMap.has(edgeKey)) {
            const transformation = inputField.transformations?.[0];
            const transformationType = transformation?.type || "DIRECT";
            const { color, strokeDasharray, strokeWidth, animated } =
              getEdgeStyle(transformation, animateEdges);

            const edge: Edge = {
              id: `lineage-${sourceTable}-${sourceCol}-${targetTable}-${targetCol}-${edgeIndex++}`,
              source: sourceTable,
              target: targetTable,
              sourceHandle: `source-${sourceCol}`,
              targetHandle: `target-${targetCol}`,
              type: "custom",
              animated: animated || false,
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
                label: `${sourceCol} → ${targetCol}`,
                transformationType,
              },
            };
            edgeMap.set(edgeKey, edge);
          }
        }
      });
    }
  });

  // Update column types for schema tables: mark unused columns that aren't used in lineage
  if (schema) {
    schema.tables.forEach((table) => {
      const tableData = tablesData.get(table.name);
      if (tableData && tableData.isSource) {
        table.columns.forEach((columnName) => {
          const existingCol = tableData.columns.get(columnName);
          if (existingCol && existingCol.type === "source") {
            // Check if this column is actually used in any lineage
            let isUsedInLineage = false;
            for (const edge of edgeMap.values()) {
              if (
                edge.source === table.name &&
                edge.sourceHandle === `source-${columnName}`
              ) {
                isUsedInLineage = true;
                break;
              }
            }
            if (!isUsedInLineage) {
              existingCol.type = "unused";
            }
          }
        });
      }
    });
  }

  // Create table nodes with proper positioning
  const tableVerticalSpacing = 400; // Increased spacing to prevent overlap
  const sourceX = 50;
  const targetX = 900; // More horizontal spacing
  let currentSourceY = 50;
  let currentTargetY = 50;

  // First pass: calculate table heights for better spacing
  const tableHeights = new Map<string, number>();
  tablesData.forEach((tableData, tableName) => {
    const columnCount = tableData.columns.size;
    const tableHeight = Math.max(250, columnCount * 35 + 120); // Increased base height and row height
    tableHeights.set(tableName, tableHeight);
  });

  tablesData.forEach((tableData, tableName) => {
    const columns = Array.from(tableData.columns.entries()).map(
      ([colName, colData]) => ({
        name: colName,
        type: colData.type,
        transformation: colData.transformation,
      })
    );

    // Sort columns: used columns first, then unused
    columns.sort((a, b) => {
      if (a.type === "unused" && b.type !== "unused") return 1;
      if (a.type !== "unused" && b.type === "unused") return -1;
      return a.name.localeCompare(b.name);
    });

    let nodeType: "source" | "target";
    let xPosition: number;
    let yPosition: number;

    const tableHeight = tableHeights.get(tableName) || 250;
    const spacing = Math.max(tableVerticalSpacing, tableHeight + 80); // Extra padding

    if (tableData.isSource && tableData.isTarget) {
      // Table is both source and target, treat as target for positioning
      nodeType = "target";
      xPosition = targetX;
      yPosition = currentTargetY;
      currentTargetY += spacing;
    } else if (tableData.isSource) {
      nodeType = "source";
      xPosition = sourceX;
      yPosition = currentSourceY;
      currentSourceY += spacing;
    } else {
      nodeType = "target";
      xPosition = targetX;
      yPosition = currentTargetY;
      currentTargetY += spacing;
    }

    const tableNode: Node<TableNodeData> = {
      id: tableName,
      type: "table",
      position: { x: xPosition, y: yPosition },
      data: {
        tableName,
        columns,
        type: nodeType,
      },
      draggable: true,
      selectable: true,
    };

    nodes.push(tableNode);
  });

  // Add all unique edges from the map created during lineage analysis
  edges.push(...Array.from(edgeMap.values()));

  return { nodes, edges };
};
