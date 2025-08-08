import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Table as TableIcon, Lock } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@meta-sql/ui";
import type { TableNodeData } from "./types";
import { getColumnIcon } from "./columnUtils";

export const TableNode: React.FC<{ data: TableNodeData }> = ({ data }) => {
  return (
    <Table className="min-w-[250px] max-w-[350px]">
      <TableHeader>
        <TableRow>
          <TableHead>
            <span className="flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              {data.tableName}
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.columns.map((column) => (
          <TableRow
            key={`${data.tableName}.${column.name}`}
            data-column-id={`${data.tableName}.${column.name}`}
          >
            <TableCell className="relative">
              {/* Individual column handles */}
              {column.type === "source" && data.type === "source" && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`source-${column.name}`}
                  style={{
                    right: -6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "var(--foreground)",
                    width: 8,
                    height: 8,
                    border: "1px solid var(--background)",
                    zIndex: 10,
                    position: "absolute",
                  }}
                />
              )}

              {column.type === "target" && data.type === "target" && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`target-${column.name}`}
                  style={{
                    position: "absolute",
                    left: -6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "var(--background)",
                    width: 8,
                    height: 8,
                    border: "1px solid var(--foreground)",
                    zIndex: 10,
                  }}
                />
              )}

              <span className="flex items-center gap-2">
                {getColumnIcon({
                  type: column.type,
                  transformation: column.transformation,
                })}
                <span className="font-medium flex items-center gap-1">
                  {column.name}
                  {/* Show masking indicator for target columns */}
                  {column.type === "target" &&
                    column.transformation?.masking && (
                      <Lock className="h-3 w-3 text-foreground" />
                    )}
                </span>
              </span>
            </TableCell>
          </TableRow>
        ))}
        {data.columns.length === 0 && (
          <TableRow>
            <TableCell>
              <span className="text-center text-gray-500">
                No columns in lineage
              </span>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
