import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { transactions, accounts, categories } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // === APP USERS ===
  app.get(api.appUsers.me.path, isAuthenticated, async (req: any, res) => {
    const authId = req.user.claims.sub;
    let appUser = await storage.getAppUser(authId);
    
    // Auto-create if not exists (first user is admin?)
    if (!appUser) {
        const allUsers = await storage.getAllAppUsers();
        const role = allUsers.length === 0 ? "admin" : "data_entry";
        appUser = await storage.createAppUser(authId, role);
    }
    
    res.json(appUser);
  });
  
  app.get(api.appUsers.list.path, isAuthenticated, async (req, res) => {
    const users = await storage.getAllAppUsers();
    res.json(users);
  });

  app.patch(api.appUsers.updateRole.path, isAuthenticated, async (req, res) => {
    // TODO: Verify current user is admin
    const id = Number(req.params.id);
    const role = req.body.role;
    const user = await storage.updateAppUserRole(id, role);
    res.json(user);
  });

  // === CATEGORIES ===
  app.get(api.categories.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getCategories();
    res.json(list);
  });

  app.post(api.categories.create.path, isAuthenticated, async (req, res) => {
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

  app.post(api.transactions.create.path, isAuthenticated, async (req: any, res) => {
    try {
        // Enforce user
      const input = api.transactions.create.input.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
        date: new Date(req.body.date), // Ensure date object
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
  
  app.post(api.transactions.approve.path, isAuthenticated, async (req: any, res) => {
     // Check admin
    const authId = req.user.claims.sub;
    const user = await storage.getAppUser(authId);
    if (user?.role !== 'admin') return res.status(403).json({ message: "Admin only" });

    const id = Number(req.params.id);
    const tx = await storage.updateTransaction(id, { 
        status: 'approved', 
        approvedBy: authId,
        approvedAt: new Date()
    });
    res.json(tx);
  });

  // === INVOICES ===
  app.get(api.invoices.list.path, isAuthenticated, async (req, res) => {
    const list = await storage.getInvoices();
    res.json(list);
  });

  app.post(api.invoices.create.path, isAuthenticated, async (req, res) => {
    try {
        const { invoice, items } = req.body;
        // Basic validation/parsing manually since schema is split
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
  
  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
    const cats = await storage.getCategories();
    if (cats.length === 0) {
        console.log("Seeding database...");
        await storage.createCategory({ name: "Sales Revenue", isSystem: true, isEnabled: true });
        await storage.createCategory({ name: "Consulting Fees", isSystem: true, isEnabled: true });
        await storage.createCategory({ name: "Office Rent", isSystem: false, isEnabled: true });
        await storage.createCategory({ name: "Salaries", isSystem: false, isEnabled: true });
        await storage.createCategory({ name: "Software Subscriptions", isSystem: false, isEnabled: true });
        await storage.createCategory({ name: "Office Supplies", isSystem: false, isEnabled: true });
        await storage.createCategory({ name: "Travel", isSystem: false, isEnabled: true });
        
        await storage.createAccount({ name: "Main Bank Account (HDFC)", type: "current", openingBalance: "100000", currentBalance: "100000", isActive: true });
        await storage.createAccount({ name: "Petty Cash", type: "cash", openingBalance: "5000", currentBalance: "5000", isActive: true });
        await storage.createAccount({ name: "Corporate Credit Card", type: "od_cc", openingBalance: "0", currentBalance: "0", isActive: true });
    }
}
