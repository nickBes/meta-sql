import {
  type ColumnLineageDatasetFacet,
  type InputField,
  type Transformation as _Transformation,
} from "@meta-sql/open-lineage";
import {
  Select,
  Column as AstColumn,
  ColumnRefItem,
  BaseFrom,
  Binary,
  ExpressionValue,
  AggrFunc,
  Function as AstFunction,
  With,
} from "node-sql-parser";
import { HashSet } from "./hashset";

type Transformation = Exclude<_Transformation, "masking"> & {
  masking: boolean; // output boolean only for easier testing
};

const MASKING_AGG_FUNCTIONS = new Set(["COUNT"]);

const MASKING_FUNCTIONS = new Set([
  "MD5",
  "SHA1",
  "SHA2",
  "SHA256",
  "SHA512",
  "MURMUR3",
  "SPOOKY_HASH_V2_32",
  "SPOOKY_HASH_V2_64",
]);

export const DIRECT_TRANSFORMATION: Transformation = {
  type: "DIRECT",
  subtype: "TRANSFORMATION",
  masking: false,
};

export const DIRECT_IDENTITY: Transformation = {
  type: "DIRECT",
  subtype: "IDENTITY",
  masking: false,
};

export const DIRECT_AGGREGATION: Transformation = {
  type: "DIRECT",
  subtype: "AGGREGATION",
  masking: false,
};

function mergeTransformations(
  parent: Transformation | undefined,
  child: Transformation
): Transformation {
  if (!parent) {
    return child;
  }

  if (child.type !== "DIRECT" || parent.type !== "DIRECT") {
    throw new Error("Indirect transformations not supported yet");
  }

  let leading: Transformation;

  // agg > transformation > identity

  if (parent.subtype === "AGGREGATION") {
    leading = parent;
  } else if (child.subtype === "AGGREGATION") {
    leading = child;
  } else if (parent.subtype === "TRANSFORMATION") {
    leading = parent;
  } else {
    leading = child;
  }

  return { ...leading, masking: parent.masking || child.masking };
}

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
  parentTransformation?: Transformation
): Record<string, TransformationSet> {
  switch (expr.type) {
    case "column_ref": {
      const inputColumnName = formatInputColumnName(expr as ColumnRefItem);

      return inputColumnName
        ? {
            [inputColumnName]: new TransformationSet([
              mergeTransformations(parentTransformation, DIRECT_IDENTITY),
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
          mergeTransformations(parentTransformation, DIRECT_TRANSFORMATION)
        )
      ).forEach(([key, value]) => {
        merged[key] = value;
      });

      Object.entries(
        getDirectTransformationsFromExprValue(
          right,
          mergeTransformations(parentTransformation, DIRECT_TRANSFORMATION)
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
        mergeTransformations(parentTransformation, {
          ...DIRECT_AGGREGATION,
          masking: MASKING_AGG_FUNCTIONS.has(aggExpr.name),
        })
      );
    }
    case "function": {
      const funcExpr = expr as AstFunction;

      return (
        funcExpr.args?.value.reduce(
          (acc, arg) => {
            const argTransformations = getDirectTransformationsFromExprValue(
              arg,
              mergeTransformations(parentTransformation, {
                ...DIRECT_TRANSFORMATION,
                masking:
                  funcExpr.name.name.length > 0 &&
                  MASKING_FUNCTIONS.has(funcExpr.name.name.at(-1)!.value),
              })
            );

            Object.entries(argTransformations).forEach(([key, value]) => {
              acc[key] = acc[key] ? acc[key].intersection(value) : value;
            });

            return acc;
          },
          {} as Record<string, TransformationSet>
        ) ?? {}
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

  const previousWiths: With[] = [];
  const withByNames: Map<string, SelectWithAlias> = new Map();

  if (select.with) {
    select.with.forEach((withItem) => {
      const s = withItem.stmt.ast ?? withItem.stmt;

      withByNames.set(withItem.name.value, {
        ...s,
        as: withItem.name.value,
        with: [...previousWiths], // keep previous with statements
      });

      previousWiths.push(withItem);
    });
  }

  if (select.from) {
    const fromItems = Array.isArray(select.from) ? select.from : [select.from];

    fromItems.forEach((item) => {
      if ("table" in item) {
        // might mention with statemnt in our select
        const matchingWith = withByNames.get(item.table);

        if (matchingWith) {
          selectTables.push({
            ...matchingWith,
            as: item.as ?? matchingWith.as,
          });
        } else {
          regularTables.push(item);
        }
      } else if ("expr" in item) {
        selectTables.push({
          ...item.expr.ast,
          as: item.as,
          with: previousWiths, // propagate previous withs
        });
      }
    });
  }

  return { regularTables, selectTables };
}

export function mergeTransformationSet(
  parent: TransformationSet,
  child: TransformationSet
): TransformationSet {
  const merged = new TransformationSet();

  parent.forEach((tp) => {
    child.forEach((tc) => {
      merged.add(mergeTransformations(tp, tc));
    });
  });

  return merged;
}

export function getColumnLineage(
  select: Select,
  schema: Schema,
  column: AstColumn,
  transformations?: TransformationSet
): InputField[] {
  let transformationsByColumns = getDirectTransformationsFromExprValue(
    column.expr
  );

  if (transformations) {
    transformationsByColumns = Object.entries(transformationsByColumns).reduce(
      (acc, [columnName, childTransformations]) => {
        acc[columnName] = mergeTransformationSet(
          transformations,
          childTransformations
        );

        return acc;
      },
      {} as Record<string, TransformationSet>
    );
  }

  const { regularTables, selectTables } = getTableExpressionsFromSelect(select);

  const inputFields: InputField[] = [];

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
      inputFields.push({
        namespace: schema.namespace,
        name: table.table,
        field: inputColumn.name,
        transformations: Array.from(transformations),
      });
    } else {
      for (const selectTable of selectTables) {
        if (inputColumn.table && inputColumn.table !== selectTable.as) {
          continue;
        }

        const matchingColumn = selectTable.columns.find(
          (c) => getOutputColumnName(c) === inputColumn.name
        );

        let nextColumn: AstColumn;

        if (matchingColumn) {
          nextColumn = matchingColumn;
        } else {
          nextColumn = column;

          // stop propogating table of column as it is only in the context of the select
          if (nextColumn.expr.type === "column_ref") {
            const expr = nextColumn.expr as ColumnRefItem;

            expr.table = null;
          }
        }

        inputFields.push(
          ...getColumnLineage(selectTable, schema, nextColumn, transformations)
        );
      }
    }
  }

  return inputFields;
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
