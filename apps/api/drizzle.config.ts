import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega o .env garantindo o caminho correto dentro do monorepo
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('A variável de ambiente DATABASE_URL não foi configurada no arquivo apps/api/.env');
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});