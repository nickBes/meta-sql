// Core types for SQL metadata processing
export interface SqlTable {
  name: string;
  schema?: string;
  columns: SqlColumn[];
}

export interface SqlColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: ForeignKeyRef;
}

export interface ForeignKeyRef {
  table: string;
  column: string;
  schema?: string;
}

export interface SqlQuery {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER';
  tables: string[];
  columns: string[];
  conditions?: string[];
}

export interface QueryMetadata {
  query: SqlQuery;
  dependencies: string[];
  affectedTables: string[];
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}
