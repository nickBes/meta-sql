# Meta-SQL Demo App

An interactive web application demonstrating the capabilities of the Meta-SQL library ecosystem for SQL query analysis and column-level lineage tracking.

## Features

- **Interactive SQL Editor**: Write and test SQL queries with syntax highlighting
- **Real-time Lineage Visualization**: See column-level data flow in an interactive graph
- **Multi-dialect Support**: Test queries in MySQL, PostgreSQL, BigQuery, Trino, SQLite, and T-SQL
- **Schema Integration**: Visualize available tables and columns before writing queries
- **Transformation Tracking**: See how data transformations affect lineage relationships
- **Data Masking Detection**: Identify columns with applied data masking

## Live Demo

The demo is automatically deployed to GitHub Pages: [https://nickbes.github.io/meta-sql/](https://nickbes.github.io/meta-sql/)

## Local Development

To run the demo locally:

```bash
# From the repository root
bun install
bun run build
bun run dev --filter=@meta-sql/demo
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Sample Queries

The demo includes sample queries for each supported SQL dialect that demonstrate various lineage scenarios:

- **Simple column mapping**: Direct field selection and aliasing
- **Join operations**: Multi-table relationships and dependencies
- **Aggregations**: GROUP BY operations and calculated fields
- **Data transformations**: Functions, calculations, and derived columns
- **Data masking**: Hash functions and data obfuscation techniques

## Architecture

The demo is built with:

- **React 19** - UI framework
- **Vite** - Build tool and development server
- **Monaco Editor** - SQL syntax highlighting and editing
- **ReactFlow** - Interactive lineage graph visualization
- **Tailwind CSS** - Styling and responsive design
- **Meta-SQL packages** - Core lineage extraction and analysis

## Deployment

The demo is automatically deployed to GitHub Pages using GitHub Actions when changes are pushed to the main branch. The deployment workflow:

1. Builds all Meta-SQL packages
2. Builds the demo app with proper base path for GitHub Pages
3. Deploys the static assets to GitHub Pages

## Contributing

To contribute to the demo:

1. Make changes to the demo app in `apps/demo/`
2. Test locally with `bun run dev --filter=@meta-sql/demo`
3. Create a pull request - the demo will be automatically deployed when merged

## License

MIT License - see [LICENSE](../../LICENSE) for details.
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
