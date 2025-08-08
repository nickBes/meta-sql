import React, { useMemo } from "react";
import {
  ReactFlow,
  ConnectionMode,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Schema } from "@meta-sql/lineage";
import type { LineageGraphProps } from "./types";
import { TableNode } from "./TableNode";
import { CustomEdge } from "./CustomEdge";
import { parseLineageData } from "./dataProcessor";

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

interface LineageGraphWithSchemaProps extends LineageGraphProps {
  schema?: Schema;
  animateEdges?: boolean;
}

export const LineageGraph: React.FC<LineageGraphWithSchemaProps> = ({
  lineageData,
  schema,
  animateEdges = true,
  className = "",
}) => {
  const { nodes, edges } = useMemo(() => {
    return parseLineageData(lineageData, schema, animateEdges);
  }, [lineageData, schema, animateEdges]);

  return (
    <div className={`h-full ${className}`}>
      <style>{`
        .react-flow__edge.animated path {
          stroke-dashoffset: 24;
          animation: dashdraw 2s linear infinite;
        }
        
        @keyframes dashdraw {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Lines} />
      </ReactFlow>
    </div>
  );
};
