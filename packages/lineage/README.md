# @meta-sql/lineage

A TypeScript library for extracting column-level lineage from SQL queries, implementing the [OpenLineage Column Lineage Dataset Facet specification](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/).

## Overview

This library analyzes SQL SELECT statements to generate detailed column-level lineage information, tracking how data flows from input columns to output columns through various transformations like joins, aggregations, filters, and CTEs (Common Table Expressions).

## Features

- ✅ **Column-level lineage extraction** from SQL SELECT statements
- ✅ **CTE (Common Table Expression) support** with nested lineage tracking
- ✅ **Direct transformations** (IDENTITY)
- ✅ **Schema-aware parsing** with table and column validation
- ✅ **OpenLineage specification compliance** for interoperability
- ✅ **TypeScript-first** with comprehensive type definitions

## Installation

```bash
npm install @meta-sql/lineage node-sql-parser
# or
bun add @meta-sql/lineage node-sql-parser
```

## Quick Start

```typescript
import { getLineage } from "@meta-sql/lineage";
import { Parser } from "node-sql-parser";

const parser = new Parser();
const ast = parser.astify("SELECT id, name FROM users") as Select;

const schema = {
  namespace: "my_database",
  tables: [{ name: "users", columns: ["id", "name", "email"] }],
};

const lineage = getLineage(ast, schema);
console.log(lineage);
// Output:
// {
//   id: {
//     inputFields: [{
//       namespace: "my_database",
//       name: "users",
//       field: "id",
//       transformations: [{ type: "DIRECT", subtype: "IDENTITY" }]
//     }]
//   },
//   name: {
//     inputFields: [{
//       namespace: "my_database",
//       name: "users",
//       field: "name",
//       transformations: [{ type: "DIRECT", subtype: "IDENTITY" }]
//     }]
//   }
// }
```

## Supported SQL Features

### ✅ Currently Supported

- Basic SELECT statements
- Column aliases (`SELECT id as user_id`)
- Common Table Expressions (CTEs)
- Nested subqueries
- Simple column references

## Roadmap

Our development roadmap aligns with the OpenLineage Column Lineage Dataset Facet specification:

### 🚧 Phase 1: Enhanced Transformations

- [ ] **DIRECT/TRANSFORMATION** support for computed columns
  - Mathematical operations (`SELECT price * quantity`)
  - String functions (`SELECT UPPER(name)`)
  - Date functions (`SELECT DATE_ADD(created_at, INTERVAL 1 DAY)`)
- [ ] **DIRECT/AGGREGATION** support for aggregation functions
  - Basic aggregations (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`)
  - GROUP BY clause handling
- [ ] **Masking detection** for privacy-preserving transformations
  - Hash functions (`SELECT MD5(email)`)
  - Anonymization functions (`SELECT ANONYMIZE(ssn)`)

### 🔄 Phase 2: Indirect Lineage

- [ ] **INDIRECT/JOIN** lineage tracking
  - Track columns used in JOIN conditions
  - Multi-table relationship mapping
- [ ] **INDIRECT/FILTER** for WHERE clause dependencies
  - Identify filtering columns that affect output
- [ ] **INDIRECT/GROUP_BY** for grouping dependencies
  - Track GROUP BY columns impact on aggregations
- [ ] **INDIRECT/SORT** for ORDER BY clause tracking

### 📊 Phase 3: Advanced SQL Features

- [ ] **INDIRECT/WINDOW** for window function dependencies
- [ ] **INDIRECT/CONDITION** for CASE WHEN and IF statements
- [ ] **Complex JOIN types** (LEFT, RIGHT, FULL OUTER)
- [ ] **UNION and INTERSECT** operations
- [ ] **Recursive CTEs** support

### 🔧 Phase 4: Enhanced Analysis

- [ ] **Dataset-level lineage** for operations affecting entire datasets
- [ ] **Multi-statement support** (DDL operations)
- [ ] **Multiple SQL dialect support** (PostgreSQL, MySQL, BigQuery, Snowflake)

## API Reference

### `getLineage(select: Select, schema: Schema): ColumnLineageDatasetFacet["fields"]`

Extracts column lineage from a SQL SELECT AST.

**Parameters:**

- `select`: Parsed SQL SELECT statement from node-sql-parser
- `schema`: Schema definition with table and column information

**Returns:** Column lineage mapping conforming to OpenLineage specification

### Types

```typescript
type Schema = {
  namespace: string;
  tables: Table[];
};

type Table = {
  name: string;
  columns: string[];
};
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.
