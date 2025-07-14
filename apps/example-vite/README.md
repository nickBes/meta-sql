# Meta-SQL Example Vite App

This is an example Vite + React application that demonstrates the usage of the `@meta-sql/core` library.

## Features

- Interactive SQL query analyzer
- Real-time metadata extraction
- Modern React UI with TypeScript
- Responsive design

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Usage

1. Enter a SQL query in the textarea
2. Click "Analyze Query" to extract metadata
3. View the results including:
   - Query type and complexity
   - Referenced tables and columns
   - Dependencies and conditions

## Example Queries

Try these example SQL queries:

```sql
SELECT name, email FROM users WHERE active = 1

SELECT u.name, p.title 
FROM users u 
JOIN posts p ON u.id = p.user_id 
WHERE u.active = 1 AND p.published = 1

INSERT INTO users (name, email, active) VALUES ('John Doe', 'john@example.com', 1)

UPDATE users SET last_login = NOW() WHERE id = 123
```
