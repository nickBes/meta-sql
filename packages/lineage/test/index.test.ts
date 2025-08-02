import { describe, test, expect } from "bun:test";
import { Parser } from "node-sql-parser";
import type { AST, Select } from "node-sql-parser";
import {
  getLineage,
  type Schema,
  type Table,
  DIRECT_AGGREGATION,
  DIRECT_IDENTITY,
  DIRECT_TRANSFORMATION,
} from "../src/index.js";

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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      wow: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_IDENTITY],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      wow: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
    });
  });

  test("select from multiple ctes", () => {
    const sql = `
    WITH active_users AS (
      SELECT 
        id,
        name,
        email
      FROM users
      WHERE status = 'active'
    ),
    user_orders AS (
      SELECT 
        user_id,
        COUNT(user_id) as order_count,
        SUM(total) as total_spent
      FROM orders
      GROUP BY user_id
    ),
    enriched_users AS (
      SELECT 
        au.id,
        au.name,
        au.email,
        COALESCE(uo.order_count, 0) as order_count,
        COALESCE(uo.total_spent, 0) as total_spent
      FROM active_users au
      LEFT JOIN user_orders uo ON au.id = uo.user_id
    )
    SELECT 
      id,
      name as full_name,
      order_count,
      total_spent * 1.1 as total_with_tax
    FROM enriched_users
    WHERE order_count > 0
    `;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("users", ["id", "name", "email", "status"]),
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      full_name: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      order_count: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "user_id",
            transformations: [
              { type: "DIRECT", subtype: "AGGREGATION", masking: true },
            ],
          },
        ],
      },
      total_with_tax: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "total",
            transformations: [DIRECT_AGGREGATION],
          },
        ],
      },
    });
  });

  test("product sales analysis with multiple ctes", () => {
    const sql = `-- Product sales analysis with store information using CTEs
WITH filtered_sales AS (
    SELECT 
        product_id,
        store_id,
        quantity_sold,
        unit_price,
        discount_percentage
    FROM product_sales 
    WHERE sale_date >= '2023-01-01'
),
store_sales_summary AS (
    SELECT 
        fs.product_id,
        fs.store_id,
        SUM(fs.quantity_sold) as total_quantity,
        AVG(fs.unit_price) as avg_price,
        SUM(fs.quantity_sold * fs.unit_price * (1 - fs.discount_percentage/100)) as net_revenue
    FROM filtered_sales fs
    GROUP BY fs.product_id, fs.store_id
),
final_report AS (
    SELECT 
        sss.product_id,
        s.store_name,
        s.region,
        sss.total_quantity,
        sss.avg_price,
        sss.net_revenue
    FROM store_sales_summary sss
    JOIN stores s ON sss.store_id = s.id
)
SELECT 
    product_id,
    store_name,
    region,
    total_quantity,
    avg_price,
    net_revenue
FROM final_report
ORDER BY net_revenue DESC`;

    const ast = parseSQL(sql);
    const schema = createSchema("trino", [
      createTable("product_sales", [
        "product_id",
        "store_id",
        "quantity_sold",
        "unit_price",
        "discount_percentage",
        "sale_date",
      ]),
      createTable("stores", ["id", "store_name", "region"]),
    ]);

    const lineage = getLineage(ast as Select, schema);

    expect(lineage).toEqual({
      product_id: {
        inputFields: [
          {
            name: "product_sales",
            namespace: "trino",
            field: "product_id",
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      store_name: {
        inputFields: [
          {
            name: "stores",
            namespace: "trino",
            field: "store_name",
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      region: {
        inputFields: [
          {
            name: "stores",
            namespace: "trino",
            field: "region",
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      total_quantity: {
        inputFields: [
          {
            name: "product_sales",
            namespace: "trino",
            field: "quantity_sold",
            transformations: [DIRECT_AGGREGATION],
          },
        ],
      },
      avg_price: {
        inputFields: [
          {
            name: "product_sales",
            namespace: "trino",
            field: "unit_price",
            transformations: [DIRECT_AGGREGATION],
          },
        ],
      },
      net_revenue: {
        inputFields: [
          {
            name: "product_sales",
            namespace: "trino",
            field: "quantity_sold",
            transformations: [DIRECT_AGGREGATION],
          },
          {
            name: "product_sales",
            namespace: "trino",
            field: "unit_price",
            transformations: [DIRECT_AGGREGATION],
          },
          {
            name: "product_sales",
            namespace: "trino",
            field: "discount_percentage",
            transformations: [DIRECT_AGGREGATION],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      wow: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_IDENTITY],
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
            transformations: [DIRECT_IDENTITY],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      name: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      next_id: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "id",
            transformations: [DIRECT_TRANSFORMATION],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      order_id: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "id",
            transformations: [DIRECT_IDENTITY],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      upper_name: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_TRANSFORMATION],
          },
        ],
      },
      email_length: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "email",
            transformations: [DIRECT_TRANSFORMATION],
          },
        ],
      },
      name_email: {
        inputFields: [
          {
            name: "users",
            namespace: "trino",
            field: "name",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "users",
            namespace: "trino",
            field: "email",
            transformations: [DIRECT_TRANSFORMATION],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      total_price: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "tax",
            transformations: [DIRECT_TRANSFORMATION],
          },
        ],
      },
      line_total: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "quantity",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [DIRECT_TRANSFORMATION],
          },
        ],
      },
      grand_total: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "tax",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "quantity",
            transformations: [DIRECT_TRANSFORMATION],
          },
        ],
      },
      discounted_price: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "discount",
            transformations: [DIRECT_TRANSFORMATION],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      complex_calc: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "tax",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "quantity",
            transformations: [DIRECT_TRANSFORMATION],
          },
          {
            name: "orders",
            namespace: "trino",
            field: "discount",
            transformations: [DIRECT_TRANSFORMATION],
          },
        ],
      },
      price_remainder: {
        inputFields: [
          {
            name: "orders",
            namespace: "trino",
            field: "price",
            transformations: [DIRECT_TRANSFORMATION],
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
            transformations: [DIRECT_IDENTITY],
          },
        ],
      },
      total_population: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "population",
            transformations: [{ ...DIRECT_AGGREGATION }],
          },
        ],
      },
      double_avg_area: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "area",
            transformations: [DIRECT_AGGREGATION],
          },
        ],
      },
      city_count_plus_one: {
        inputFields: [
          {
            name: "cities",
            namespace: "trino",
            field: "city",
            transformations: [{ ...DIRECT_AGGREGATION, masking: true }],
          },
        ],
      },
    });
  });
});
