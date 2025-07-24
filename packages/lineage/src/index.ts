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
      const inputColumnName = getInputColumnName(expr as ColumnRefItem);

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
  selectTables: Select[];
} {
  const regularTables: BaseFrom[] = [];
  const selectTables: Select[] = [];

  if (select.from) {
    const fromItems = Array.isArray(select.from) ? select.from : [select.from];

    fromItems.forEach((item) => {
      if ("table" in item) {
        regularTables.push(item);
      } else if ("expr" in item) {
        selectTables.push(item.expr.ast);
      }
    });
  }

  if (select.with) {
    select.with.forEach((withItem) => {
      selectTables.push(withItem.stmt.ast);
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
    const table = regularTables.find((t) =>
      schema.tables.some(
        (s) =>
          s.columns.some((c) => c === inputColumnName) && s.name === t.table
      )
    );

    if (table) {
      return [
        {
          namespace: schema.namespace,
          name: table.table,
          field: inputColumnName,
          transformations: Array.from(transformations),
        },
      ];
    } else {
      const inputFields = [];

      for (const selectTable of selectTables) {
        const matchingColumn = selectTable.columns.find(
          (c) => getOutputColumnName(c) === inputColumnName
        );

        inputFields.push(
          ...getColumnLineage(selectTable, schema, matchingColumn ?? column)
        );
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
