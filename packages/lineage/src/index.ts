import { ColumnLineageDatasetFacet, InputField } from "@meta-sql/open-lineage";
import {
  Select,
  Column as AstColumn,
  ColumnRefItem,
  BaseFrom,
} from "node-sql-parser";

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

export function isColumn(value: Select["columns"][number]): value is AstColumn {
  return (
    typeof value === "object" &&
    value !== null &&
    "as" in value &&
    "expr" in value &&
    typeof value.expr === "object" &&
    value.expr !== null
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
  if (column.expr.type === "column_ref") {
    const columnItemRef = column.expr as ColumnRefItem;
    const inputColumnName = getInputColumnName(columnItemRef);

    if (!inputColumnName) {
      return [];
    }

    const { regularTables, selectTables } =
      getTableExpressionsFromSelect(select);

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
          transformations: [
            {
              type: "DIRECT",
              subtype: "IDENTITY",
            },
          ],
        },
      ];
    } else {
      for (const selectTable of selectTables) {
        const matchingColumn: AstColumn | undefined = selectTable.columns.find(
          (c) => isColumn(c) && getOutputColumnName(c) === inputColumnName
        );

        if (matchingColumn) {
          const inputFields = getColumnLineage(
            selectTable,
            schema,
            matchingColumn
          );

          if (inputFields.length > 0) {
            return inputFields;
          }
        }
      }
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
