import { describe, test, expect } from "bun:test";
import { Parser } from "node-sql-parser";
import type { AST, Select } from "node-sql-parser";
import { getLineage, type Schema, type Table } from "../src/index.js";

const parser = new Parser();

// Helper function to create schemas
function createSchema(namespace: string, tables: Table[]): Schema {
  return { namespace, tables };
}

function createTable(name: string, columns: string[]): Table {
  return { name, columns };
}

// Helper to ensure we get a single AST
function parseSQL(sql: string): AST {
  const result = parser.astify(sql);
  const ast = Array.isArray(result) ? result[0] : result;

  if (!ast) {
    throw new Error("Failed to parse SQL");
  }

  return ast;
}

describe("Select Lineage", () => {
  test("select from cte", () => {
    const sql = `
    WITH u AS (
      SELECT 
        id,
        name
      FROM users
    ) 
    SELECT 
      id,
      name as wow
    FROM u
    `;
    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("users", ["id", "name", "email"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      id: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      wow: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
    });
  });

  test("select from cte with *", () => {
    const sql = `
                WITH u AS (
                  SELECT * FROM users
                )
                SELECT 
                  id,
                  name as wow
                FROM (SELECT * FROM u) AS t`;
    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("users", ["id", "name", "email"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      id: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      wow: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
    });
  });

  test("select with lots of aliases", () => {
    const sql = `
    WITH u AS (
      SELECT 
        id as i,
        name as n
      FROM users
    ) 
    SELECT 
      i as id,
      n as wow
    FROM u
    `;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("users", ["id", "name", "email"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      id: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      wow: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
    });
  });
});
