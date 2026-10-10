import { defineConfig } from 'drizzle-kit';
export default defineConfig({ out: './drizzle', schema: './apps/sites-api/db/schema.ts', dialect: 'sqlite' });
