import { SqlQuery } from "./types.js";

/**
 * Basic SQL query parser for extracting metadata
 */
export class SqlParser {
  /**
   * Parse a SQL query string and extract basic metadata
   */
  parse(sql: string): SqlQuery {
    const normalizedSql = sql.trim().toUpperCase();

    // Determine query type
    const type = this.getQueryType(normalizedSql);

    // Extract tables (basic implementation)
    const tables = this.extractTables(sql, type);

    // Extract columns (basic implementation)
    const columns = this.extractColumns(sql, type);

    return {
      type,
      tables,
      columns,
      conditions: this.extractConditions(sql),
    };
  }

  private getQueryType(sql: string): SqlQuery["type"] {
    if (sql.startsWith("SELECT")) return "SELECT";
    if (sql.startsWith("INSERT")) return "INSERT";
    if (sql.startsWith("UPDATE")) return "UPDATE";
    if (sql.startsWith("DELETE")) return "DELETE";
    if (sql.startsWith("CREATE")) return "CREATE";
    if (sql.startsWith("DROP")) return "DROP";
    if (sql.startsWith("ALTER")) return "ALTER";
    return "SELECT"; // default
  }

  private extractTables(sql: string, type: SqlQuery["type"]): string[] {
    const tables: string[] = [];

    // Basic regex patterns for different query types
    const patterns = {
      SELECT: /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
      INSERT: /INTO\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
      UPDATE:
        /UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
      DELETE: /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
    };

    const pattern = patterns[type as keyof typeof patterns];
    if (pattern) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        if (match[1]) {
          tables.push(match[1]);
        }
      }
    }

    return Array.from(new Set(tables)); // Remove duplicates
  }

  private extractColumns(sql: string, type: SqlQuery["type"]): string[] {
    const columns: string[] = [];

    if (type === "SELECT") {
      // Extract columns from SELECT clause (basic implementation)
      const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
      if (selectMatch && selectMatch[1]) {
        const columnsPart = selectMatch[1];
        if (columnsPart.trim() === "*") {
          columns.push("*");
        } else {
          // Split by comma and clean up
          const cols = columnsPart
            .split(",")
            .map((col) => {
              const parts = col.trim().split(" ");
              return parts[0] || "";
            })
            .filter((col) => col.length > 0);
          columns.push(...cols);
        }
      }
    }

    return columns;
  }

  private extractConditions(sql: string): string[] {
    const conditions: string[] = [];

    // Extract WHERE conditions (basic implementation)
    const whereMatch = sql.match(
      /WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i
    );
    if (whereMatch && whereMatch[1]) {
      conditions.push(whereMatch[1].trim());
    }

    return conditions;
  }
}
