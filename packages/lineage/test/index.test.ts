import { describe, it, expect } from "bun:test";
import { SqlParser, SqlAnalyzer } from "../src/index";

describe("SqlParser", () => {
  const parser = new SqlParser();

  it("should parse a simple SELECT query", () => {
    const sql = "SELECT name, email FROM users WHERE id = 1";
    const result = parser.parse(sql);

    expect(result.type).toBe("SELECT");
    expect(result.tables).toContain("users");
    expect(result.columns).toContain("name");
    expect(result.columns).toContain("email");
  });

  it("should parse an INSERT query", () => {
    const sql = "INSERT INTO users (name, email) VALUES (?, ?)";
    const result = parser.parse(sql);

    expect(result.type).toBe("INSERT");
    expect(result.tables).toContain("users");
  });
});

describe("SqlAnalyzer", () => {
  const analyzer = new SqlAnalyzer();

  it("should analyze query complexity", () => {
    const simpleSql = "SELECT * FROM users";
    const complexSql =
      "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id WHERE u.active = 1 AND p.published = 1";

    const simpleResult = analyzer.analyze(simpleSql);
    const complexResult = analyzer.analyze(complexSql);

    expect(simpleResult.estimatedComplexity).toBe("LOW");
    expect(complexResult.estimatedComplexity).toBe("MEDIUM");
  });

  it("should identify dependencies", () => {
    const sql =
      "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id";
    const result = analyzer.analyze(sql);

    expect(result.dependencies.length).toBeGreaterThan(0);
    expect(result.affectedTables).toEqual(result.query.tables);
  });
});
