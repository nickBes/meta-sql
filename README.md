# Meta-SQL

A TypeScript library ecosystem for processing SQL queries and extracting metadata, with a focus on column-level lineage tracking compatible with OpenLineage standards.

## Overview

Meta-SQL provides tools for analyzing SQL queries to understand data lineage and dependencies. The project consists of modular packages that work together to parse SQL, extract column relationships, and generate metadata that follows industry standards.

## Packages

### [@meta-sql/lineage](./packages/lineage)

A TypeScript library for extracting column-level lineage from SQL queries. It analyzes SELECT statements to track how data flows from input columns to output columns through various transformations.

**Key Features:**

- Column-level lineage extraction from SQL SELECT statements
- Common Table Expression (CTE) support with nested tracking
- Schema-aware parsing with table and column validation
- OpenLineage specification compliance
- TypeScript-first with comprehensive type definitions

**Example:**

```typescript
import { getLineage } from "@meta-sql/lineage";
import { Parser } from "node-sql-parser";

const parser = new Parser();
const ast = parser.astify("SELECT id, name FROM users") as Select;
const schema = {
  namespace: "db",
  tables: [{ name: "users", columns: ["id", "name"] }],
};
const lineage = getLineage(ast, schema);
```

### [@meta-sql/open-lineage](./packages/open-lineage)

TypeScript type definitions for OpenLineage facets, providing strongly-typed interfaces for the OpenLineage specification.

**Key Features:**

- Complete TypeScript types for OpenLineage Column Lineage Dataset Facets
- Support for all transformation types (DIRECT/INDIRECT)
- Extensible interfaces for custom facet properties
- Compliance with OpenLineage specification v1.2.0

**Supported Transformation Types:**

- **DIRECT**: IDENTITY, TRANSFORMATION, AGGREGATION
- **INDIRECT**: JOIN, GROUP_BY, FILTER, SORT, WINDOW, CONDITION

## OpenLineage Compatibility

Both packages are designed to work with the [OpenLineage](https://openlineage.io/) ecosystem, ensuring compatibility with:

- Apache Airflow OpenLineage integration
- DataHub lineage ingestion
- Marquez metadata collection
- Custom OpenLineage consumers

## Installation

```bash
# Install specific packages
npm install @meta-sql/lineage node-sql-parser

# Or with bun
bun add @meta-sql/lineage node-sql-parser
```

## Development

This project uses Turborepo for efficient monorepo management:

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test

# Start development
bun run dev
```

## License

MIT License - see [LICENSE](LICENSE) for details.
