# Meta-SQL

A powerful TypeScript library and toolset for processing SQL queries metadata. Built with Turborepo and Bun.js for optimal development experience.

## Features

- 🚀 **Fast SQL parsing**: Extract metadata from SQL queries quickly
- 📊 **Query analysis**: Analyze complexity, dependencies, and structure
- 🏗️ **TypeScript first**: Built with type safety in mind
- ⚡ **Modern tooling**: Turborepo + Bun.js for blazing fast builds
- 🎨 **Interactive demo**: Vite-powered example application

## Project Structure

This is a Turborepo monorepo containing:

### Packages

- **`@meta-sql/core`**: Core TypeScript library for SQL metadata processing
- **`@repo/eslint-config`**: Shared ESLint configurations
- **`@repo/typescript-config`**: Shared TypeScript configurations

### Applications

- **`example-vite`**: Interactive Vite + React demo application
- **`documentation`**: Next.js documentation site

## Quick Start

```bash
# Install dependencies
bun install

# Start development (all apps)
bun run dev

# Build all packages and apps
bun run build

# Run tests
bun run test

# Lint all code
bun run lint
```

## Core Library Usage

```typescript
import { SqlAnalyzer } from '@meta-sql/core';

const analyzer = new SqlAnalyzer();

const result = analyzer.analyze(`
  SELECT u.name, p.title 
  FROM users u 
  JOIN posts p ON u.id = p.user_id 
  WHERE u.active = 1
`);

console.log(result);
// Output:
// {
//   query: {
//     type: 'SELECT',
//     tables: ['users', 'posts'],
//     columns: ['u.name', 'p.title'],
//     conditions: ['u.active = 1']
//   },
//   estimatedComplexity: 'MEDIUM',
//   dependencies: ['users', 'posts'],
//   affectedTables: ['users', 'posts']
// }
```

## Development

This project uses:

- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- [Turborepo](https://turborepo.com/) - Monorepo build system
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Fast frontend build tool
- [React](https://react.dev/) - UI library for examples

## Scripts

- `bun run build` - Build all packages and applications
- `bun run dev` - Start development servers for all applications
- `bun run lint` - Run ESLint across all packages
- `bun run format` - Format code with Prettier
- `bun run check-types` - Run TypeScript type checking
- `bun run test` - Run tests across all packages

## Contributing

1. Clone the repository
2. Install dependencies: `bun install`
3. Start development: `bun run dev`
4. Make your changes
5. Run tests: `bun run test`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
