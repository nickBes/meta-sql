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

  test("select with function transformation", () => {
    const sql = `SELECT 
      id,
      UPPER(name) as upper_name,
      LENGTH(email) as email_length,
      CONCAT(name, email) as name_email
    FROM users`;

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
      upper_name: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      email_length: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "email",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      name_email: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "users",
            namespace: "trino",
            field: "email",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
    });
  });

  test("select with arithmetic operations", () => {
    const sql = `SELECT 
      id,
      price + tax as total_price,
      quantity * price as line_total,
      (price + tax) * quantity as grand_total,
      price - discount as discounted_price
    FROM orders`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("orders", ["id", "price", "tax", "quantity", "discount"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      id: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      total_price: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "tax",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      line_total: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "quantity",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      grand_total: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "tax",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "quantity",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      discounted_price: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "discount",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
    });
  });

  test("select with complex nested arithmetic", () => {
    const sql = `SELECT 
      id,
      ((price + tax) * quantity) / discount as complex_calc,
      price % 10 as price_remainder
    FROM orders`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("orders", ["id", "price", "tax", "quantity", "discount"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      id: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "id",
            transformations: [{ type: "DIRECT", subtype: "IDENTITY" }],
          },
        ],
      },
      complex_calc: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "tax",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "quantity",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "discount",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      price_remainder: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
    });
  });

  test("select with mixed aggregation and arithmetic", () => {
    const sql = `SELECT 
      country,
      SUM(population) as total_population,
      AVG(area) * 2 as double_avg_area,
      COUNT(city) + 1 as city_count_plus_one
    FROM cities
    GROUP BY country`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("cities", ["country", "city", "population", "area"]),
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
      total_population: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "population",
            transformations: [
              { type: "DIRECT", subtype: "AGGREGATION", masking: false },
            ],
          },
        ],
      },
      double_avg_area: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "area",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
      city_count_plus_one: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "city",
            transformations: [{ type: "DIRECT", subtype: "TRANSFORMATION" }],
          },
        ],
      },
    });
  });
});
