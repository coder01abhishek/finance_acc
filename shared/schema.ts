import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";

// Re-export auth models
export * from "./models/auth";

// ENUMS
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer", "opening_balance"]);
export const accountTypeEnum = pgEnum("account_type", ["current", "od_cc", "cash", "upi"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["draft", "submitted", "approved", "rejected"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "hr", "manager", "data_entry"]);
export const goalTypeEnum = pgEnum("goal_type", ["revenue", "expense"]);
export const goalPeriodEnum = pgEnum("goal_period", ["monthly", "quarterly"]);

// EXTEND USERS TABLE (Optional - handled via metadata or separate table if strict constraints needed)
// For now, we'll assume the 'users' table from auth is sufficient for identity.
// We'll create a separate table for app-specific user profile/roles linked to the auth user.

export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  authId: text("auth_id").notNull().unique(), // Links to users.id from auth
  role: userRoleEnum("role").default("data_entry").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// CATEGORIES
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // Prevent deleting critical categories
});

// ACCOUNTS
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).default("0").notNull(),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0").notNull(), // Cached balance
  isActive: boolean("is_active").default(true).notNull(),
});

// TRANSACTIONS
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  toAccountId: integer("to_account_id").references(() => accounts.id), // For transfers
  description: text("description"), // Short description
  notes: text("notes"), // Long notes
  attachmentUrl: text("attachment_url"),
  status: transactionStatusEnum("status").default("draft").notNull(),
  createdBy: text("created_by").notNull(), // Auth ID
  createdAt: timestamp("created_at").defaultNow(),
  approvedBy: text("approved_by"), // Auth ID
  approvedAt: timestamp("approved_at"),
});

// CLIENTS
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
});

// INVOICES
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  date: date("date").notNull(),
  dueDate: date("due_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

// GOALS
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  type: goalTypeEnum("type").notNull(),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  period: goalPeriodEnum("period").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AUDIT LOGS
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  userId: text("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  details: text("details"), // JSON stringified details
});

// RELATIONS
export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  toAccount: one(accounts, {
    fields: [transactions.toAccountId],
    references: [accounts.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

// SCHEMAS
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, currentBalance: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true, 
  approvedBy: true, 
  approvedAt: true 
});
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true });

// TYPES
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type AppUser = typeof appUsers.$inferSelect;

// ENRICHED TYPES FOR API
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  client?: Client;
}

export interface TransactionWithDetails extends Transaction {
  category?: Category;
  account?: Account;
  toAccount?: Account;
}

export interface DashboardStats {
  currentMonthProfitLoss: number;
  totalAvailableFunds: number;
  odLimitUsed: number;
  odLimitRemaining: number; // Assuming a fixed limit or stored somewhere
  topExpenses: { category: string; amount: number }[];
  revenueByService: { service: string; amount: number }[]; // Derived from categories or tags? User said "Revenue by Service Type" - likely Category
}
