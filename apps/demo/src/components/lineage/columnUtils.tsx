import React from "react";
import {
  Database,
  ArrowRight,
  Square,
  Link,
  BarChart3,
  Filter,
  ArrowUpDown,
  Calculator,
  HelpCircle,
  Circle,
  TrendingUp,
  Layers,
  Target,
  GitBranch,
} from "lucide-react";
import type { Transformation } from "@meta-sql/open-lineage";
import type { ColumnType } from "./types";

interface ColumnIconProps {
  type: ColumnType;
  transformation?: Transformation;
}

export const getColumnIcon = ({
  type,
  transformation,
}: ColumnIconProps): React.ReactElement => {
  // For target columns, show icon based on transformation
  if (type === "target") {
    // Handle specific subtypes
    if (transformation?.subtype) {
      switch (transformation.subtype) {
        case "IDENTITY":
          return <Square className="h-3 w-3 text-foreground" />;
        case "TRANSFORMATION":
          return <Calculator className="h-3 w-3 text-foreground" />;
        case "AGGREGATION":
          return <BarChart3 className="h-3 w-3 text-foreground" />;
        case "JOIN":
          return <Link className="h-3 w-3 text-foreground" />;
        case "GROUP_BY":
          return <Layers className="h-3 w-3 text-foreground" />;
        case "FILTER":
          return <Filter className="h-3 w-3 text-foreground" />;
        case "SORT":
          return <ArrowUpDown className="h-3 w-3 text-foreground" />;
        case "WINDOW":
          return <TrendingUp className="h-3 w-3 text-foreground" />;
        case "CONDITION":
          return <Target className="h-3 w-3 text-foreground" />;
        default:
          return <HelpCircle className="h-3 w-3 text-foreground" />;
      }
    }

    // Handle transformation types if no subtype
    if (transformation?.type) {
      switch (transformation.type) {
        case "DIRECT":
          return <ArrowRight className="h-3 w-3 text-foreground" />;
        case "INDIRECT":
          return <GitBranch className="h-3 w-3 text-foreground" />;
        default:
          return <ArrowRight className="h-3 w-3 text-foreground" />;
      }
    }

    // Default target icon
    return <ArrowRight className="h-3 w-3 text-foreground" />;
  }

  // Handle other column types
  switch (type) {
    case "source":
      return <Database className="h-3 w-3 text-foreground" />;
    case "unused":
      return <Circle className="h-3 w-3 text-foreground" />;
    default:
      return <HelpCircle className="h-3 w-3 text-foreground" />;
  }
};
