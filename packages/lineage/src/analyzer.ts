import { SqlParser } from "./parser.js";
import { SqlQuery, QueryMetadata } from "./types.js";

/**
 * SQL metadata analyzer for processing queries and extracting insights
 */
export class SqlAnalyzer {
  private parser: SqlParser;

  constructor() {
    this.parser = new SqlParser();
  }

  /**
   * Analyze a SQL query and return comprehensive metadata
   */
  analyze(sql: string): QueryMetadata {
    const query = this.parser.parse(sql);

    return {
      query,
      dependencies: this.calculateDependencies(query),
      affectedTables: query.tables,
      estimatedComplexity: this.estimateComplexity(query),
    };
  }

  /**
   * Analyze multiple queries and return batch metadata
   */
  analyzeBatch(queries: string[]): QueryMetadata[] {
    return queries.map((sql) => this.analyze(sql));
  }

  private calculateDependencies(query: SqlQuery): string[] {
    // For now, dependencies are just the tables involved
    // In a more sophisticated implementation, this could include
    // views, functions, stored procedures, etc.
    return query.tables;
  }

  private estimateComplexity(query: SqlQuery): "LOW" | "MEDIUM" | "HIGH" {
    let complexity: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    // Basic complexity estimation based on number of tables and conditions
    if (query.tables.length > 3) {
      complexity = "HIGH";
    } else if (
      query.tables.length > 1 ||
      (query.conditions && query.conditions.length > 2)
    ) {
      complexity = "MEDIUM";
    }

    // Increase complexity for certain query types
    if (
      query.type === "CREATE" ||
      query.type === "ALTER" ||
      query.type === "DROP"
    ) {
      complexity = complexity === "LOW" ? "MEDIUM" : "HIGH";
    }

    return complexity;
  }
}
