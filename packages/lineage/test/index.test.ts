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
  const result = parser.astify(sql, { database: "trino" });
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

  test("select with group by", () => {
    const sql = `SELECT country, count(city) as city_count
      FROM cities
      GROUP BY country`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("cities", ["country", "city"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      country: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "country",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      city_count: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "city",
            transformations: [
              { type: "DIRECT", subtype: "AGGREGATION", masking: true },
            ],
          },
        ],
      },
    });
  });

  test("select with binary expression", () => {
    const sql = `SELECT id, name, id + 1 as next_id
      FROM users`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("users", ["id", "name"]),
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
      name: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      next_id: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
    });
  });

  test("select same column different tables", () => {
    const sql = `SELECT u.id, o.id as order_id
      FROM users u
      JOIN orders o ON u.id = o.user_id`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("users", ["id", "name", "email"]),
      createTable("orders", ["id", "user_id", "total"]),
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
      order_id: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
    });
  });
});
