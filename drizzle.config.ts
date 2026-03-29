import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'; // Ini cara paling praktis untuk memuat .env secara otomatis

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Gunakan non-null assertion (!) karena kita yakin DATABASE_URL ada di Railway/Lokal
    url: process.env.DATABASE_URL!,
  },
});
