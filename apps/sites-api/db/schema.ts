import { sql } from 'drizzle-orm';
import { sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('gym_records', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('idx_gym_records_kind').on(table.kind), uniqueIndex('idx_gym_records_customer_phone').on(sql`json_extract(${table.payload}, '$.phone')`).where(sql`${table.kind} = 'customer'`)]);
