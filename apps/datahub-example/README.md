# DataHub OpenLineage Ingestion Example

This example demonstrates how to ingest column-level lineage from SQL queries into DataHub using OpenLineage events.

## Installation

```bash
bun install
```

## Configuration

Set the DataHub OpenLineage endpoint:

```bash
export DATAHUB_OPENLINEAGE_ENDPOINT="http://localhost:8080/openapi/openlineage/api/v1/lineage"
export DATAHUB_TOKEN="your-token"  # optional
```

## Usage

```bash
bun run src/index.ts
```

Edit `src/index.ts` to customize:

- **SQL Query**: Update the `sqlQuery` variable
- **Schema**: Modify the `schema` object with your table definitions
- **Output Dataset**: Configure `lineageConfig.outputDataset`

## Example Output

```
🔍 Parsing SQL query...
📊 Generating column lineage...
📤 Sending run event...
✅ Successfully sent run event for analytics_pipeline/user_events_report
✅ Successfully ingested lineage for 4 columns
🎉 Lineage ingestion completed successfully!
```
