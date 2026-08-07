import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Garante que as variáveis de ambiente do .env sejam lidas localmente
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('A variável de ambiente DATABASE_URL não foi encontrada.');
}

// Configuração do cliente Postgres otimizada para conexões seguras
const queryClient = postgres(process.env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });