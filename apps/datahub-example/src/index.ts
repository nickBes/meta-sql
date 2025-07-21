/**
 * DataHub OpenLineage Ingester
 *
 * This script ingests column-level lineage using the @meta-sql/lineage package
 * to the OpenLineage REST endpoint of DataHub using job metadata events.
 */

import { Parser } from "node-sql-parser";
import { getLineage, Schema } from "@meta-sql/lineage";
import {
  ColumnLineageDatasetFacet,
  SchemaDatasetFacet,
} from "@meta-sql/open-lineage";
import { RunEvent } from "@meta-sql/open-lineage";

/**
 * Configuration for the DataHub GMS OpenLineage endpoint
 */
interface DataHubConfig {
  openlineageEndpoint: string;
  token?: string;
}

/**
 * Configuration for lineage processing
 */
interface LineageConfig {
  producer?: string;
  job: {
    namespace: string;
    name: string;
  };
  outputDataset: {
    namespace: string;
    name: string;
  };
}

/**
 * DataHub GMS OpenLineage Ingester class
 */
export class DataHubLineageIngester {
  private config: DataHubConfig;
  private parser: Parser;

  constructor(config: DataHubConfig) {
    this.config = config;
    this.parser = new Parser();
  }

  /**
   * Send an OpenLineage run event to DataHub GMS
   */
  private async sendRunEvent(event: RunEvent): Promise<void> {
    const url = this.config.openlineageEndpoint;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.token) {
      headers["Authorization"] = `Bearer ${this.config.token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorText = (await response.text()) ?? (await response.json());
        throw new Error(
          `Failed to send run event: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      console.log(
        `✅ Successfully sent run event for ${event.job.namespace}/${event.job.name}`
      );
    } catch (error) {
      console.error(`❌ Failed to send run event:`, error);
      throw error;
    }
  }

  public async ingestLineage(
    sqlQuery: string,
    schema: Schema,
    lineageConfig: LineageConfig
  ): Promise<void> {
    try {
      console.log(`🔍 Parsing SQL query...`);

      // Parse the SQL query
      const ast = this.parser.astify(sqlQuery);

      if (!ast || typeof ast !== "object" || !("type" in ast)) {
        throw new Error("Failed to parse SQL query or unsupported query type");
      }

      if (ast.type !== "select") {
        throw new Error("Only SELECT queries are currently supported");
      }

      console.log(`📊 Generating column lineage...`);

      // Generate column lineage using the lineage package
      const columnLineage = getLineage(ast, schema);

      const eventTime = new Date().toISOString();
      const producer =
        lineageConfig.producer || "https://github.com/apache/airflow/";

      // Create the column lineage facet
      const columnLineageFacet: ColumnLineageDatasetFacet = {
        _producer: producer,
        _schemaURL:
          "https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json",
        fields: columnLineage,
      };

      // Create schema facet for output dataset
      const outputSchemaFacet: SchemaDatasetFacet = {
        _producer: producer,
        _schemaURL:
          "https://openlineage.io/spec/facets/1-1-1/SchemaDatasetFacet.json",
        fields: [
          {
            name: "customer_name",
            type: "VARCHAR",
            description: "Customer name from user data",
          },
          {
            name: "event_name",
            type: "VARCHAR",
            description: "Name of the event",
          },
          {
            name: "browser",
            type: "VARCHAR",
            description: "Browser information",
          },
          {
            name: "event_timestamp",
            type: "TIMESTAMP",
            description: "When the event occurred",
          },
        ],
      };

      console.log(`📤 Sending run event...`);

      // Generate a unique run ID
      const runId = crypto.randomUUID();

      // Send run event
      const runEvent: RunEvent = {
        eventTime,
        producer,
        schemaURL: "https://openlineage.io/spec/2-0-2/OpenLineage.json",
        eventType: "COMPLETE",
        job: {
          namespace: lineageConfig.job.namespace,
          name: lineageConfig.job.name,
        },
        run: {
          runId,
        },
        inputs: [
          {
            namespace: "hive://localhost:9083",
            name: "fct_users_created",
          },
          {
            namespace: "hive://localhost:9083",
            name: "logging_events",
          },
        ],
        outputs: [
          {
            namespace: lineageConfig.outputDataset.namespace,
            name: lineageConfig.outputDataset.name,
            facets: {
              columnLineage: columnLineageFacet,
              schema: outputSchemaFacet,
            },
          },
        ],
      };

      await this.sendRunEvent(runEvent);

      console.log(
        `✅ Successfully ingested lineage for ${Object.keys(columnLineage).length} columns`
      );
    } catch (error) {
      console.error(`❌ Failed to ingest lineage:`, error);
      throw error;
    }
  }
}

/**
 * Example usage function
 */
export async function example() {
  // Configuration
  if (!process.env.DATAHUB_OPENLINEAGE_ENDPOINT) {
    throw new Error(
      "DATAHUB_OPENLINEAGE_ENDPOINT environment variable is not set"
    );
  }

  const datahubConfig: DataHubConfig = {
    openlineageEndpoint: process.env.DATAHUB_OPENLINEAGE_ENDPOINT,
    token: process.env.DATAHUB_TOKEN, // Optional authentication token
  };

  // Sample schema definition
  const schema: Schema = {
    namespace: "hive://localhost:9083",
    tables: [
      {
        name: "fct_users_created",
        columns: ["user_id", "user_name"],
      },
      {
        name: "logging_events",
        columns: ["event_name", "event_data", "timestamp", "browser"],
      },
    ],
  };

  // Sample SQL query with column lineage
  const sqlQuery = `
    SELECT 
      u.user_name as customer_name,
      l.event_name,
      l.browser,
      l.timestamp as event_timestamp
    FROM fct_users_created u
    JOIN logging_events l ON u.user_id = l.event_data
    WHERE l.timestamp >= '2023-01-01'
  `;

  // Lineage configuration
  const lineageConfig: LineageConfig = {
    job: {
      namespace: "analytics_pipeline",
      name: "user_events_report",
    },
    outputDataset: {
      namespace: "hive://localhost:9083",
      name: "user_events_summary",
    },
  };

  // Create ingester and process lineage
  const ingester = new DataHubLineageIngester(datahubConfig);

  try {
    await ingester.ingestLineage(sqlQuery, schema, lineageConfig);
    console.log("🎉 Lineage ingestion completed successfully!");
  } catch (error) {
    console.error("💥 Lineage ingestion failed:", error);
    process.exit(1);
  }
}

example().catch(console.error);
