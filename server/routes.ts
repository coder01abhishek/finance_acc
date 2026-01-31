import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Extend session with user data
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Simple auth middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Admin-only middleware
async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getAppUserById(req.session.userId);
  if (user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup session middleware
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // === AUTH ROUTES ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = api.auth.login.input.parse(req.body);
      
      const user = await storage.getAppUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }
      
      req.session.userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getAppUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json({ user: { ...user, password: undefined } });
  });

  // === APP USERS (Admin only) ===
  app.get(api.appUsers.list.path, isAdmin, async (req, res) => {
    const users = await storage.getAllAppUsers();
    // Remove passwords from response
    const safeUsers = users.map(u => ({ ...u, password: undefined }));
    res.json(safeUsers);
  });

  app.post(api.appUsers.create.path, isAdmin, async (req, res) => {
    try {
      const input = api.appUsers.create.input.parse(req.body);
      
      // Check if user with this email already exists
      const existingUser = await storage.getAppUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      const user = await storage.createAppUserWithPassword(input.email, input.name, hashedPassword, input.role);
      res.status(201).json({ ...user, password: undefined });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.appUsers.updateRole.path, isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const role = req.body.role;
    const user = await storage.updateAppUserRole(id, role);
    res.json({ ...user, password: undefined });
  });

  app.delete(api.appUsers.delete.path, isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteAppUser(id);
    res.status(204).send();
  });

  // === CATEGORIES (Admin only for create/update/delete) ===
  app.get(api.categories.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getCategories();
    res.json(list);
  });

  app.post(api.categories.create.path, isAdmin, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.categories.update.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.categories.update.input.parse(req.body);
    const category = await storage.updateCategory(id, input);
    res.json(category);
  });
  
  app.delete(api.categories.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  // === ACCOUNTS ===
  app.get(api.accounts.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getAccounts();
    res.json(list);
  });

  app.post(api.accounts.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.accounts.create.input.parse(req.body);
      const account = await storage.createAccount(input);
      res.status(201).json(account);
    } catch (err) {
        console.log(err)
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.accounts.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteAccount(id);
    res.status(204).send();
  });

  // === EXCHANGE RATES ===
  app.get("/api/exchange-rate/:currency", isAuthenticated, async (req, res) => {
    const currency = String(req.params.currency).toUpperCase();
    if (currency === "INR") {
      return res.json({ rate: 1, currency: "INR", base: "INR" });
    }
    
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=INR`);
      if (!response.ok) throw new Error("Failed to fetch rate");
      const data = await response.json();
      res.json({ rate: data.rates.INR, currency, base: "INR" });
    } catch (err) {
      res.status(500).json({ message: "Could not fetch exchange rate" });
    }
  });

  // === TRANSACTIONS ===
  app.get(api.transactions.list.path, isAuthenticated, async (req, res) => {
    const filters = {
        month: req.query.month as string,
        accountId: req.query.accountId ? Number(req.query.accountId) : undefined,
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        status: req.query.status as string,
    };
    const list = await storage.getTransactions(filters);
    res.json(list);
  });

  app.post(api.transactions.create.path, isAuthenticated, async (req, res) => {
    try {
      const { originalAmount, originalCurrency, exchangeRateToInr } = req.body;
      
      const rate = exchangeRateToInr ? parseFloat(exchangeRateToInr) : 1;
      const amountInInr = parseFloat(originalAmount) * rate;
      
      const input = api.transactions.create.input.parse({
        ...req.body,
        originalAmount: originalAmount.toString(),
        originalCurrency: originalCurrency || "INR",
        exchangeRateToInr: rate.toString(),
        amountInInr: amountInInr.toFixed(2),
        createdBy: String(req.session.userId),
        date: new Date(req.body.date),
      });
      const tx = await storage.createTransaction(input);
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  app.post(api.transactions.approve.path, isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const user = await storage.getAppUserById(userId);
    if (user?.role !== 'admin') return res.status(403).json({ message: "Admin only" });

    const id = Number(req.params.id);
    const tx = await storage.updateTransaction(id, { 
        status: 'approved'
    });
    res.json(tx);
  });

  app.delete(api.transactions.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteTransaction(id);
    res.status(204).send();
  });

  // === INVOICES ===
  app.get(api.invoices.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getInvoices();
    res.json(list);
  });

  app.post(api.invoices.create.path, isAuthenticated, async (req, res) => {
    try {
        const { invoice, items } = req.body;
        const newInvoice = await storage.createInvoice(invoice, items);
        res.status(201).json(newInvoice);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  // === CLIENTS ===
  app.get(api.clients.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getClients();
    res.json(list);
  });
  
  app.post(api.clients.create.path, isAuthenticated, async (req, res) => {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
  });

  // === DASHBOARD ===
  app.get(api.dashboard.stats.path, isAuthenticated, async (req, res) => {
    const stats = await storage.getDashboardStats(req.query.month as string);
    res.json(stats);
  });

  // === GOALS ===
  app.get(api.goals.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getGoals();
    res.json(list);
  });

  app.post(api.goals.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.goals.create.input.parse(req.body);
      const goal = await storage.createGoal(input);
      res.status(201).json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const cats = await storage.getCategories();
  if (cats.length === 0) {
    console.log("Seeding database with dummy data...");
    
    // Create Categories
    const salesRev = await storage.createCategory({ name: "Sales Revenue", isSystem: true, isEnabled: true });
    const consultFees = await storage.createCategory({ name: "Consulting Fees", isSystem: true, isEnabled: true });
    const rent = await storage.createCategory({ name: "Office Rent", isSystem: false, isEnabled: true });
    const salaries = await storage.createCategory({ name: "Salaries", isSystem: false, isEnabled: true });
    const software = await storage.createCategory({ name: "Software Subscriptions", isSystem: false, isEnabled: true });
    const supplies = await storage.createCategory({ name: "Office Supplies", isSystem: false, isEnabled: true });
    const travel = await storage.createCategory({ name: "Travel", isSystem: false, isEnabled: true });
    
    // Create Accounts
    const hdfc = await storage.createAccount({ name: "Main Bank Account (HDFC)", type: "current", openingBalance: "100000", isActive: true });
    const cash = await storage.createAccount({ name: "Petty Cash", type: "cash", openingBalance: "5000", isActive: true });
    const cc = await storage.createAccount({ name: "Corporate Credit Card", type: "od_cc", openingBalance: "0", isActive: true });

    // Create Clients
    const clientA = await storage.createClient({ name: "Acme Corp", email: "finance@acme.com", phone: "+1-555-0123", address: "123 Business Way", isActive: true });
    const clientB = await storage.createClient({ name: "Global Tech Solutions", email: "billing@globaltech.io", phone: "+1-555-9876", address: "456 Innovation Dr", isActive: true });

    // Create Invoices
    await storage.createInvoice(
      { invoiceNumber: "INV-2026-001", clientId: clientA.id, date: "2026-01-15", dueDate: "2026-02-15", totalAmount: "25000", totalAmountInInr: "25000", status: "paid" },
      [{ description: "UI/UX Design Services", quantity: "1", price: "25000", amount: "25000" }]
    );
    await storage.createInvoice(
      { invoiceNumber: "INV-2026-002", clientId: clientB.id, date: "2026-01-20", dueDate: "2026-02-20", totalAmount: "15000", totalAmountInInr: "15000", status: "sent" },
      [{ description: "Mobile App Development - Milestone 1", quantity: "1", price: "15000", amount: "15000" }]
    );

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createAppUserWithPassword("admin@finops.com", "Admin User", hashedPassword, "admin");
    console.log("Created default admin user: admin@finops.com / admin123");

    // Create Transactions (Approved ones affect stats)
    const adminId = "1";
    
    // Income
    await storage.createTransaction({
      date: new Date(),
      originalAmount: "25000",
      originalCurrency: "INR",
      exchangeRateToInr: "1",
      amountInInr: "25000",
      type: "income",
      categoryId: salesRev.id,
      accountId: hdfc.id,
      description: "Acme Corp Invoice Payment",
      status: "approved",
      createdBy: adminId
    });

    // Expenses
    await storage.createTransaction({
      date: new Date(),
      originalAmount: "45000",
      originalCurrency: "INR",
      exchangeRateToInr: "1",
      amountInInr: "45000",
      type: "expense",
      categoryId: rent.id,
      accountId: hdfc.id,
      description: "January Office Rent",
      status: "approved",
      createdBy: adminId
    });

    await storage.createTransaction({
      date: new Date(),
      originalAmount: "1200",
      originalCurrency: "INR",
      exchangeRateToInr: "1",
      amountInInr: "1200",
      type: "expense",
      categoryId: software.id,
      accountId: cc.id,
      description: "Cloud Hosting - AWS",
      status: "approved",
      createdBy: adminId
    });

    // Draft Transaction
    await storage.createTransaction({
      date: new Date(),
      originalAmount: "500",
      originalCurrency: "INR",
      exchangeRateToInr: "1",
      amountInInr: "500",
      type: "expense",
      categoryId: supplies.id,
      accountId: cash.id,
      description: "Stationery items",
      status: "draft",
      createdBy: adminId
    });

    // Create a Goal
    await storage.createGoal({
      type: "revenue",
      targetAmount: "500000",
      period: "monthly",
      startDate: "2026-01-01",
      endDate: "2026-01-31"
    });
  }
}
