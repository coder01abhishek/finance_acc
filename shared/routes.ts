import { z } from 'zod';
import { 
  insertCategorySchema, 
  insertAccountSchema, 
  insertTransactionSchema, 
  insertClientSchema, 
  insertInvoiceSchema, 
  insertInvoiceItemSchema, 
  insertGoalSchema,
  categories, accounts, transactions, clients, invoices, goals, invoiceItems, appUsers
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === CATEGORIES ===
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories',
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/categories/:id',
      input: insertCategorySchema.partial(),
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === ACCOUNTS ===
  accounts: {
    list: {
      method: 'GET' as const,
      path: '/api/accounts',
      responses: {
        200: z.array(z.custom<typeof accounts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/accounts',
      input: insertAccountSchema,
      responses: {
        201: z.custom<typeof accounts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/accounts/:id',
      input: insertAccountSchema.partial(),
      responses: {
        200: z.custom<typeof accounts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/accounts/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === TRANSACTIONS ===
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      input: z.object({
        month: z.string().optional(), // YYYY-MM
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect & { category?: any, account?: any, toAccount?: any }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/transactions/:id',
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions',
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/transactions/:id',
      input: insertTransactionSchema.partial(),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transactions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    approve: {
      method: 'POST' as const,
      path: '/api/transactions/:id/approve',
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        403: errorSchemas.unauthorized, // Only admin
      },
    },
    reject: {
      method: 'POST' as const,
      path: '/api/transactions/:id/reject',
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        403: errorSchemas.unauthorized, // Only admin
      },
    },
  },

  // === CLIENTS ===
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients',
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clients/:id',
      input: insertClientSchema.partial(),
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === INVOICES ===
  invoices: {
    list: {
      method: 'GET' as const,
      path: '/api/invoices',
      responses: {
        200: z.array(z.custom<typeof invoices.$inferSelect & { client: any }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/invoices/:id',
      responses: {
        200: z.custom<typeof invoices.$inferSelect & { client: any, items: any[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/invoices',
      input: z.object({
        invoice: insertInvoiceSchema,
        items: z.array(insertInvoiceItemSchema),
      }),
      responses: {
        201: z.custom<typeof invoices.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/invoices/:id/status',
      input: z.object({ status: z.enum(["draft", "sent", "paid", "overdue"]) }),
      responses: {
        200: z.custom<typeof invoices.$inferSelect>(),
      },
    },
    sendEmail: {
      method: 'POST' as const,
      path: '/api/invoices/:id/email',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },

  // === GOALS ===
  goals: {
    list: {
      method: 'GET' as const,
      path: '/api/goals',
      responses: {
        200: z.array(z.custom<typeof goals.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/goals',
      input: insertGoalSchema,
      responses: {
        201: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // === DASHBOARD & REPORTS ===
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      input: z.object({ month: z.string().optional() }).optional(), // YYYY-MM
      responses: {
        200: z.object({
          currentMonthProfitLoss: z.number(),
          totalAvailableFunds: z.number(),
          odLimitUsed: z.number(),
          odLimitRemaining: z.number(),
          topExpenses: z.array(z.object({ category: z.string(), amount: z.number() })),
          revenueByService: z.array(z.object({ service: z.string(), amount: z.number() })),
        }),
      },
    },
  },

  // === APP USERS / ROLES ===
  appUsers: {
    me: {
      method: 'GET' as const,
      path: '/api/me/role',
      responses: {
        200: z.custom<typeof appUsers.$inferSelect>(),
        404: errorSchemas.notFound, // If not yet set up
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/admin/users',
      responses: {
        200: z.array(z.custom<typeof appUsers.$inferSelect & { email: string | null, name: string | null }>()),
      },
    },
    updateRole: {
      method: 'PATCH' as const,
      path: '/api/admin/users/:id/role',
      input: z.object({ role: z.enum(["admin", "hr", "manager", "data_entry"]) }),
      responses: {
        200: z.custom<typeof appUsers.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admin/users/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/users',
      input: z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(["admin", "hr", "manager", "data_entry"]),
      }),
      responses: {
        201: z.custom<typeof appUsers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
