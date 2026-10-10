import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
export const workspaceRecords = sqliteTable('gym_workspace_records', {
  ownerId: text('owner_id').notNull(), id: text('id').notNull(), kind: text('kind').notNull(),
  payload: text('payload').notNull(), customerPhone: text('customer_phone'), createdAt: text('created_at').notNull(),
}, t => [primaryKey({columns:[t.ownerId,t.id]}),index('idx_workspace_kind').on(t.ownerId,t.kind),uniqueIndex('idx_workspace_phone').on(t.ownerId,t.customerPhone)]);
export const accounts = sqliteTable('gym_login_accounts', {
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),customerId:text('customer_id'),role:text('role').notNull(),
  email:text('email').notNull(),passwordHash:text('password_hash').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_account_email_role').on(t.role,t.email),index('idx_account_owner').on(t.ownerId,t.customerId)]);
export const sessions = sqliteTable('gym_login_sessions', {
  tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_session_account').on(t.accountId)]);
export const authLimits = sqliteTable('gym_auth_limits', {
  key:text('key').primaryKey(),attempts:integer('attempts').notNull(),resetAt:integer('reset_at').notNull(),
});
