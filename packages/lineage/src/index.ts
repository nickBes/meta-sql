import {
  ColumnLineageDatasetFacet,
  InputField,
  Transformation,
} from "@meta-sql/open-lineage";
import {
  Select,
  Column as AstColumn,
  ColumnRefItem,
  BaseFrom,
  Binary,
  ExpressionValue,
  AggrFunc,
} from "node-sql-parser";
import { HashSet } from "./hashset";

const MASKING_AGG_FUNCTIONS = new Set(["COUNT"]);

const DIRECT_TRANSFORMATION: Transformation = {
  type: "DIRECT",
  subtype: "TRANSFORMATION",
};

const DIRECT_IDENTITY: Transformation = {
  type: "DIRECT",
  subtype: "IDENTITY",
};

const DIRECT_AGGREGATION: Transformation = {
  type: "DIRECT",
  subtype: "AGGREGATION",
};

class TransformationSet extends HashSet<Transformation> {
  constructor(values?: readonly Transformation[]) {
    super(
      (value: Transformation) =>
        `${value.type}-${value.subtype}-${value.masking ? "MASKED" : "UNMASKED"}`
    );

    if (values) {
      values.forEach((value) => this.add(value));
    }
  }
}

export type Column = {
  name: string;
};

export type Table = {
  name: string;
  columns: string[];
};

export type Schema = {
  namespace: string;
  tables: Table[];
};

export type InputColumn = {
  name: string;
  table?: string;
};

export type SelectWithAlias = Select & {
  as?: string | null;
};

export function isColumn(
  selectColumn: Select["columns"][number]
): selectColumn is AstColumn {
  return (
    typeof selectColumn === "object" &&
    selectColumn !== null &&
    "as" in selectColumn &&
    "expr" in selectColumn &&
    typeof selectColumn.expr === "object" &&
    selectColumn.expr !== null
  );
}

export function formatInputColumnName(column: ColumnRefItem): string {
  return `${column.table ? `${column.table}.` : ""}${getInputColumnName(
    column
  )}`;
}

export function parseInputColumnName(column: string): InputColumn {
  const parts = column.split(".");
  const name = parts.pop() || "";
  const table = parts.length > 0 ? parts.join(".") : undefined;

  return { name, table };
}

export function getInputColumnName(column: ColumnRefItem): string | null {
  return typeof column.column === "string"
    ? column.column
    : typeof column.column.expr.value === "string"
      ? column.column.expr.value
      : null;
}

export function getOutputColumnName(column: AstColumn): string | null {
  if (column.as) {
    return typeof column.as === "string" ? column.as : column.as.value;
  } else if (column.expr.type === "column_ref") {
    return getInputColumnName(column.expr as ColumnRefItem);
  }

  return null;
}

export function getDirectTransformationsFromExprValue(
  expr: ExpressionValue,
  override?: Transformation
): Record<string, TransformationSet> {
  switch (expr.type) {
    case "column_ref": {
      const inputColumnName = formatInputColumnName(expr as ColumnRefItem);

      return inputColumnName
        ? {
            [inputColumnName]: new TransformationSet([
              override ?? DIRECT_IDENTITY,
            ]),
          }
        : {};
    }
    case "binary_expr": {
      const { left, right } = expr as Binary;

      const merged: Record<string, TransformationSet> = {};

      Object.entries(
        getDirectTransformationsFromExprValue(
          left,
          override ?? DIRECT_TRANSFORMATION
        )
      ).forEach(([key, value]) => {
        merged[key] = value;
      });

      Object.entries(
        getDirectTransformationsFromExprValue(
          right,
          override ?? DIRECT_TRANSFORMATION
        )
      ).forEach(([key, value]) => {
        const prev = merged[key];

        if (prev) {
          merged[key] = prev.intersection(value);
        } else {
          merged[key] = value;
        }
      });

      return merged;
    }
    case "aggr_func": {
      const aggExpr = expr as AggrFunc;

      return getDirectTransformationsFromExprValue(
        aggExpr.args.expr,
        override ?? {
          ...DIRECT_AGGREGATION,
          masking: MASKING_AGG_FUNCTIONS.has(aggExpr.name),
        }
      );
    }
    default:
      return {};
  }
}

export function getTableExpressionsFromSelect(select: Select): {
  regularTables: BaseFrom[];
  selectTables: SelectWithAlias[];
} {
  const regularTables: BaseFrom[] = [];
  const selectTables: SelectWithAlias[] = [];

  if (select.from) {
    const fromItems = Array.isArray(select.from) ? select.from : [select.from];

    fromItems.forEach((item) => {
      if ("table" in item) {
        regularTables.push(item);
      } else if ("expr" in item) {
        selectTables.push({ ...item.expr.ast, as: item.as });
      }
    });
  }

  if (select.with) {
    select.with.forEach((withItem) => {
      selectTables.push({ ...withItem.stmt.ast, as: withItem.name.value });
    });
  }

  return { regularTables, selectTables };
}

export function getColumnLineage(
  select: Select,
  schema: Schema,
  column: AstColumn
): InputField[] {
  const transformationsByColumns = getDirectTransformationsFromExprValue(
    column.expr
  );

  const { regularTables, selectTables } = getTableExpressionsFromSelect(select);

  for (const [inputColumnName, transformations] of Object.entries(
    transformationsByColumns
  )) {
    const inputColumn = parseInputColumnName(inputColumnName);

    const table = regularTables.find(
      (t) =>
        (!inputColumn.table ||
          inputColumn.table === t.table ||
          inputColumn.table === t.as) &&
        schema.tables.some(
          (s) =>
            s.name === t.table && s.columns.some((c) => c === inputColumn.name)
        )
    );

    if (table) {
      return [
        {
          namespace: schema.namespace,
          name: table.table,
          field: inputColumn.name,
          transformations: Array.from(transformations),
        },
      ];
    } else {
      const inputFields = [];

      for (const selectTable of selectTables) {
        if (inputColumn.table && inputColumn.table !== selectTable.as) {
          continue;
        }

        const matchingColumn = selectTable.columns.find(
          (c) => getOutputColumnName(c) === inputColumn.name
        );

        const nextColumn = matchingColumn ?? column;

        // stop propogating table of column as it is only in the context of the select
        if (nextColumn.expr.type === "column_ref") {
          const expr = nextColumn.expr as ColumnRefItem;

          expr.table = null;
        }

        inputFields.push(...getColumnLineage(selectTable, schema, nextColumn));
      }

      return inputFields;
    }
  }

  return [];
}

export function getLineage(
  select: Select,
  schema: Schema
): ColumnLineageDatasetFacet["fields"] {
  let unkownCount = 0;

  return select.columns.reduce((acc, column) => {
    if (!isColumn(column)) {
      return acc;
    }

    let outputFieldName = getOutputColumnName(column);

    if (!outputFieldName) {
      outputFieldName = `unknown_${unkownCount++}`;
    }

    return {
      ...acc,
      [outputFieldName]: {
        inputFields: getColumnLineage(select, schema, column),
      },
    };
  }, {});
}
