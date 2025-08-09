import React, { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button, Badge } from "@meta-sql/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@meta-sql/ui";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  CheckIcon,
  ChevronsUpDown,
} from "lucide-react";
import { getLineage, type Schema } from "@meta-sql/lineage";
import type { ColumnLineageDatasetFacet } from "@meta-sql/open-lineage";
import { Parser } from "node-sql-parser";
import { sampleQueries, type SupportedDialect } from "./sampleQueries.js";
import { cn } from "@meta-sql/ui/lib/utils";

// Use the actual return type from getLineage
type LineageResult = ColumnLineageDatasetFacet["fields"];

const dialectOptions = [
  {
    value: "mysql" as const,
    label: "MySQL",
  },
  {
    value: "postgresql" as const,
    label: "PostgreSQL",
  },
  {
    value: "bigquery" as const,
    label: "BigQuery",
  },
  {
    value: "sqlite" as const,
    label: "SQLite",
  },
  {
    value: "trino" as const,
    label: "Trino",
  },
  {
    value: "transactsql" as const,
    label: "SQL Server",
  },
] satisfies Array<{ value: SupportedDialect; label: string }>;

interface SQLEditorProps {
  onQueryParsed: (
    lineageResult: LineageResult,
    query: string,
    dialect: string
  ) => void;
  schema?: Schema;
  className?: string;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  onQueryParsed,
  schema,
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const [dialect, setDialect] = useState<SupportedDialect>("mysql");
  const [open, setOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const analyzeQuery = useCallback(() => {
    // Real-time syntax validation and lineage analysis on every change
    if (query.trim()) {
      try {
        const parser = new Parser();
        const ast = parser.astify(query, { database: dialect });
        const firstStatement = Array.isArray(ast) ? ast[0] : ast;

        if (firstStatement) {
          // Check if it's a SELECT statement
          if (firstStatement && firstStatement.type === "select") {
            // Use the schema directly since it's already in the correct format
            const lineageSchema: Schema = schema || {
              namespace: "default",
              tables: [],
            };

            // Get column lineage and update the graph
            const lineageResult = getLineage(firstStatement, lineageSchema);

            onQueryParsed(lineageResult, query, dialect);

            setValidationResult({ isValid: true, errors: [] });
          } else {
            setValidationResult({
              isValid: false,
              errors: [
                "Only SELECT statements are supported for lineage analysis",
              ],
            });
          }
        } else {
          setValidationResult({
            isValid: false,
            errors: ["Invalid SQL query structure"],
          });
        }
      } catch (error) {
        console.error(error);

        setValidationResult({
          isValid: false,
          errors: [
            error instanceof Error ? error.message : "Unknown parsing error",
          ],
        });
      }
    } else {
      setValidationResult(null);
    }
  }, [query, dialect, schema, onQueryParsed]);

  useEffect(() => {
    analyzeQuery();
  }, [analyzeQuery]);

  const handleLoadSample = () => {
    setQuery(sampleQueries[dialect]);
  };

  return (
    <div className={`h-full ${className}`}>
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="noShadow"
                  size="sm"
                  role="combobox"
                  aria-expanded={open}
                  className="w-[200px] justify-between"
                >
                  {dialect
                    ? dialectOptions.find((option) => option.value === dialect)
                        ?.label
                    : "Select dialect..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search dialect..." />
                  <CommandList>
                    <CommandEmpty>No dialect found.</CommandEmpty>
                    <CommandGroup>
                      {dialectOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            setDialect(currentValue as SupportedDialect);
                            setOpen(false);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              dialect === option.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button size="sm" onClick={handleLoadSample}>
              <FileText className="h-4 w-4" />
              Sample
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {validationResult && (
              <Badge variant={validationResult.isValid ? "default" : "neutral"}>
                {validationResult.isValid ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Valid
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Syntax Error
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="h-[65vh]">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={query}
            onChange={(value) => setQuery(value || "")}
            theme="light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: "on",
            }}
          />
        </div>

        {validationResult && !validationResult.isValid && (
          <div className="p-4 border-t">
            <div className="flex flex-col gap-2">
              <Badge variant="neutral">
                <AlertCircle className="h-3 w-3" />
                Syntax Errors
              </Badge>
              <div className="flex flex-col gap-1">
                {validationResult.errors.map((error, index) => (
                  <Badge
                    key={index}
                    variant="neutral"
                    className="text-wrap text-ellipsis inline max-w-3xl"
                  >
                    {error}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
