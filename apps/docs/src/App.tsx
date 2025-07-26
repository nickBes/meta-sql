import { useState } from "react";
import { Button } from "@meta-sql/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@meta-sql/ui";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-center space-x-8">
          <a href="https://vite.dev" target="_blank" rel="noreferrer">
            <img src={viteLogo} className="h-24 w-24" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img
              src={reactLogo}
              className="h-24 w-24 animate-spin"
              alt="React logo"
            />
          </a>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Meta-SQL Documentation</h1>
          <p className="text-lg text-muted-foreground">
            A TypeScript library ecosystem for processing SQL queries and
            extracting metadata
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>@meta-sql/lineage</CardTitle>
              <CardDescription>
                Extract column-level lineage from SQL queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze SELECT statements to track how data flows from input
                columns to output columns through various transformations.
              </p>
              <Button variant="outline" size="sm">
                Learn More
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>@meta-sql/open-lineage</CardTitle>
              <CardDescription>
                TypeScript types for OpenLineage facets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Strongly-typed interfaces for the OpenLineage specification,
                ensuring compatibility with data lineage tools.
              </p>
              <Button variant="outline" size="sm">
                View Types
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interactive Demo</CardTitle>
            <CardDescription>
              Test the button component from our shared UI library
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button onClick={() => setCount((count) => count + 1)}>
                Count is {count}
              </Button>
              <Button variant="secondary" onClick={() => setCount(0)}>
                Reset
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This demonstrates the shared UI components working across the
              monorepo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
