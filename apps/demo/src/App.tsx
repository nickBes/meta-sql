import { useState, useCallback } from "react";
import { GitBranch, Github } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@meta-sql/ui";
import { SQLEditor } from "./components/editor";
import { LineageGraph } from "./components/lineage/LineageGraph";
import type { ColumnLineageDatasetFacet } from "@meta-sql/open-lineage";
import type { Schema } from "@meta-sql/lineage";

// Use the actual return type from getLineage
type LineageResult = ColumnLineageDatasetFacet["fields"];

// Default schema matching the sample queries
const defaultSchema: Schema = {
  namespace: "default",
  tables: [
    {
      name: "product_sales",
      columns: [
        "id",
        "product_id",
        "quantity_sold",
        "unit_price",
        "sale_date",
        "store_id",
        "discount_percentage",
      ],
    },
    {
      name: "stores",
      columns: ["id", "store_name", "region", "manager_id"],
    },
    {
      name: "user_profiles",
      columns: [
        "user_id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "date_of_birth",
        "ssn",
        "address",
        "city",
        "state",
        "zip_code",
      ],
    },
  ],
};

export default function App() {
  const [lineageData, setLineageData] = useState<LineageResult | undefined>();
  const [schema] = useState<Schema>(defaultSchema);

  const handleQueryParsed = useCallback((lineageResult: LineageResult) => {
    setLineageData(lineageResult);
  }, []);

  return (
    <div className="min-h-screen bg-background font-[DM Sans]">
      {/* Header */}
      <header className="bg-secondary-background border-b-4  border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-main" />
              <h1 className="text-xl font-bold text-foreground">
                @meta-sql/lineage
              </h1>
            </div>
            <div className="hidden md:block text-sm text-foreground/70">
              Interactive Demo - SQL Column Lineage Analysis Package
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* GitHub Link */}
            <a
              href="https://github.com/nickBes/meta-sql"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - Horizontal Layout */}
      <div className="flex h-[calc(100vh-73px)] min-h-0 gap-4 p-4">
        {/* Left Panel - SQL Editor */}
        <Card className="flex-1 bg-secondary-background shadow-shadow">
          <CardHeader className="pb-4">
            <CardTitle>SQL Editor</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-theme(spacing.20))]">
            <SQLEditor
              onQueryParsed={handleQueryParsed}
              schema={schema}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* Right Panel - Lineage Graph */}
        <Card className="flex-1 bg-secondary-background shadow-shadow relative">
          <CardContent className="absolute inset-0 p-0">
            <LineageGraph
              lineageData={lineageData || {}}
              schema={schema}
              className="h-full w-full"
            />
          </CardContent>
          <CardHeader className="relative z-  10 bg-transparent">
            <CardTitle>Data Lineage Graph</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
