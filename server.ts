import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables from .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Robust DB path handling: prioritize DB_PATH env, then handle production vs development
const dbPath = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'data', 'subboss_service.db')
    : 'subboss_service.db'
);

const JWT_SECRET = process.env.JWT_SECRET || 'subboss-secret-key-123';

// Ensure the directory for the database exists
const dbDir = path.dirname(dbPath);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    displayName TEXT,
    role TEXT DEFAULT 'user',
    isPro BOOLEAN DEFAULT 0,
    branding TEXT, -- JSON for logo and colors
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT NOT NULL,
    currentMileage INTEGER NOT NULL,
    type TEXT NOT NULL,
    tasks TEXT, -- JSON array
    isPublic BOOLEAN DEFAULT 0,
    shareSlug TEXT UNIQUE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    roundedMileage INTEGER NOT NULL,
    tasks TEXT NOT NULL, -- JSON array
    notes TEXT,
    attachments TEXT, -- JSON array
    cost REAL DEFAULT 0,
    category TEXT DEFAULT 'Service',
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    userId TEXT NOT NULL,
    type TEXT NOT NULL, -- tuning, gutachten, abe, tuev
    name TEXT NOT NULL,
    price REAL DEFAULT 0,
    date TEXT NOT NULL,
    notes TEXT,
    attachments TEXT, -- JSON array
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper to track events
const trackEvent = (type: string) => {
  try {
    db.prepare('INSERT INTO event_logs (event_type) VALUES (?)').run(type);
  } catch (err) {
    console.error('Failed to track event:', err);
  }
};

// Migrations
const info = db.prepare("PRAGMA table_info(vehicles)").all() as any[];
const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
const historyCols = db.prepare("PRAGMA table_info(history)").all() as any[];

if (!info.some(col => col.name === 'tasks')) {
  db.exec("ALTER TABLE vehicles ADD COLUMN tasks TEXT");
}
if (!info.some(col => col.name === 'userId')) {
  db.exec("ALTER TABLE vehicles ADD COLUMN userId TEXT DEFAULT 'anonymous'");
}
if (!info.some(col => col.name === 'isPublic')) {
  db.exec("ALTER TABLE vehicles ADD COLUMN isPublic BOOLEAN DEFAULT 0");
}
if (!info.some(col => col.name === 'shareSlug')) {
  db.exec("ALTER TABLE vehicles ADD COLUMN shareSlug TEXT");
}

if (!userCols.some(col => col.name === 'role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
}
if (!userCols.some(col => col.name === 'isPro')) {
  db.exec("ALTER TABLE users ADD COLUMN isPro BOOLEAN DEFAULT 0");
}
if (!userCols.some(col => col.name === 'branding')) {
  db.exec("ALTER TABLE users ADD COLUMN branding TEXT");
}

if (!historyCols.some(col => col.name === 'userId')) {
  db.exec("ALTER TABLE history ADD COLUMN userId TEXT DEFAULT 'anonymous'");
}
if (!historyCols.some(col => col.name === 'cost')) {
  db.exec("ALTER TABLE history ADD COLUMN cost REAL DEFAULT 0");
}
if (!historyCols.some(col => col.name === 'category')) {
  db.exec("ALTER TABLE history ADD COLUMN category TEXT DEFAULT 'Service'");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Seed initial admin if no admin exists
  const seedAdmin = () => {
    try {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any;
      if (adminCount.count === 0) {
        db.prepare("UPDATE users SET role = 'admin', isPro = 1 WHERE email = ?").run('marlinhilkerr@gmail.com');
      }
    } catch (e) {
      console.error("Admin seed failed", e);
    }
  };
  seedAdmin();

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.id;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Admin Middleware
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(decoded.id) as any;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Zugriff nur für Administratoren.' });
      }
      
      req.userId = decoded.id;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, displayName } = req.body;
    try {
      // Explicit check for existing email
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      
      // Default roles (Admin Panel should be used for management thereafter)
      const role = 'user';
      const isPro = 0;

      db.prepare('INSERT INTO users (id, email, password, displayName, role, isPro) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, email, hashedPassword, displayName, role, isPro);
      
      const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.status(201).json({ id, email, displayName });
    } catch (err: any) {
      res.status(500).json({ error: 'Registrierung fehlgeschlagen. Bitte versuche es später erneut.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ 
        id: user.id, 
        email: user.email, 
        displayName: user.displayName,
        role: user.role,
        isPro: !!user.isPro,
        branding: JSON.parse(user.branding || '{}')
      });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.sendStatus(200);
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare('SELECT id, email, displayName, role, isPro, branding FROM users WHERE id = ?').get(decoded.id) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({
        ...user,
        isPro: !!user.isPro,
        branding: JSON.parse(user.branding || '{}')
      });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Account Management
  app.patch('/api/auth/profile', authenticate, async (req: any, res) => {
    const { email, password, displayName } = req.body;
    try {
      if (email) {
        const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.userId);
        if (existing) return res.status(400).json({ error: 'E-Mail bereits vergeben.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
      let hashedPassword = user.password;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      db.prepare('UPDATE users SET email = ?, password = ?, displayName = ? WHERE id = ?')
        .run(email || user.email, hashedPassword, displayName || user.displayName, req.userId);
      
      res.json({ id: req.userId, email: email || user.email, displayName: displayName || user.displayName });
    } catch (err) {
      res.status(500).json({ error: 'Update fehlgeschlagen' });
    }
  });

  app.delete('/api/auth/account', authenticate, (req: any, res) => {
    try {
      // Cascading delete relies on PRAGMA foreign_keys = ON
      db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
      res.clearCookie('token');
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Lösche fehlgeschlagen' });
    }
  });

  app.delete('/api/auth/data', authenticate, (req: any, res) => {
    try {
      db.transaction(() => {
        db.prepare('DELETE FROM history WHERE userId = ?').run(req.userId);
        db.prepare('DELETE FROM vehicles WHERE userId = ?').run(req.userId);
      })();
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Datenlöschung fehlgeschlagen' });
    }
  });

  // Protected API Routes
  app.get('/api/vehicles', authenticate, (req: any, res) => {
    try {
      const vehicles = db.prepare('SELECT * FROM vehicles WHERE userId = ?').all(req.userId);
      const history = db.prepare('SELECT * FROM history WHERE userId = ?').all(req.userId);
      const documents = db.prepare('SELECT * FROM documents WHERE userId = ?').all(req.userId);
      
      const combined = (vehicles as any[]).map(v => ({
        ...v,
        tasks: JSON.parse(v.tasks || '[]'),
        history: (history as any[])
          .filter(h => h.vehicleId === v.id)
          .map(h => ({
            ...h,
            tasks: JSON.parse(h.tasks),
            attachments: JSON.parse(h.attachments || '[]')
          })),
        documents: (documents as any[])
          .filter(d => d.vehicleId === v.id)
          .map(d => ({
            ...d,
            attachments: JSON.parse(d.attachments || '[]')
          }))
      }));
      
      res.json(combined);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.post('/api/vehicles', authenticate, (req: any, res) => {
    const { id, name, model, year, currentMileage, type, tasks } = req.body;
    try {
      const user = db.prepare('SELECT isPro FROM users WHERE id = ?').get(req.userId) as any;
      const vehicleCount = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE userId = ?').get(req.userId) as any;
      
      if (!user.isPro && vehicleCount.count >= 2) {
        return res.status(403).json({ error: 'Limit erreicht: Maximal 2 Fahrzeuge pro Account. Upgrade auf PRO für unbegrenzte Fahrzeuge.' });
      }

      const shareSlug = crypto.randomBytes(4).toString('hex');

      db.prepare('INSERT INTO vehicles (id, userId, name, model, year, currentMileage, type, tasks, shareSlug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.userId, name, model, year, currentMileage, type, JSON.stringify(tasks || []), shareSlug);
      trackEvent('vehicle_created');
      res.status(201).json({ id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Save failed' });
    }
  });

  app.patch('/api/vehicles/:id', authenticate, (req: any, res) => {
    const { name, model, year, currentMileage, type, tasks, isPublic } = req.body;
    try {
      const user = db.prepare('SELECT isPro FROM users WHERE id = ?').get(req.userId) as any;
      
      // Gate public sharing to Pro users
      const publicStatus = (isPublic && user?.isPro) ? 1 : 0;
      if (isPublic && !user?.isPro) {
        return res.status(403).json({ error: 'Öffentliches Teilen ist ein PRO-Feature.' });
      }

      db.prepare('UPDATE vehicles SET name = ?, model = ?, year = ?, currentMileage = ?, type = ?, tasks = ?, isPublic = ? WHERE id = ? AND userId = ?')
        .run(name, model, year, currentMileage, type, JSON.stringify(tasks || []), publicStatus, req.params.id, req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  app.delete('/api/vehicles/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM vehicles WHERE id = ? AND userId = ?').run(req.params.id, req.userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.post('/api/history', authenticate, (req: any, res) => {
    const { id, vehicleId, date, mileage, roundedMileage, tasks, notes, attachments, cost, category } = req.body;
    try {
      db.prepare('INSERT INTO history (id, vehicleId, userId, date, mileage, roundedMileage, tasks, notes, attachments, cost, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, vehicleId, req.userId, date, mileage, roundedMileage, JSON.stringify(tasks), notes, JSON.stringify(attachments || []), cost || 0, category || 'Service');
      trackEvent('service_created');
      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ error: 'Log entry failed' });
    }
  });

  app.patch('/api/history/:id', authenticate, (req: any, res) => {
    const { date, mileage, roundedMileage, tasks, notes, attachments, cost, category } = req.body;
    try {
      db.prepare('UPDATE history SET date = ?, mileage = ?, roundedMileage = ?, tasks = ?, notes = ?, attachments = ?, cost = ?, category = ? WHERE id = ? AND userId = ?')
        .run(date, mileage, roundedMileage, JSON.stringify(tasks), notes, JSON.stringify(attachments || []), cost || 0, category || 'Service', req.params.id, req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Document Routes
  app.post('/api/documents', authenticate, (req: any, res) => {
    const { id, vehicleId, type, name, price, date, notes, attachments } = req.body;
    try {
      const user = db.prepare('SELECT isPro FROM users WHERE id = ?').get(req.userId) as any;
      if (!user?.isPro) {
        return res.status(403).json({ error: 'Dokumenten-Management ist nur in der PRO-Version verfügbar.' });
      }

      db.prepare('INSERT INTO documents (id, vehicleId, userId, type, name, price, date, notes, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, vehicleId, req.userId, type, name, price || 0, date, notes, JSON.stringify(attachments || []));
      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ error: 'Dokument konnte nicht gespeichert werden.' });
    }
  });

  app.delete('/api/documents/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM documents WHERE id = ? AND userId = ?').run(req.params.id, req.userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Löschen fehlgeschlagen.' });
    }
  });

  // Public Vehicle Route (Sales Mode)
  app.get('/api/public/vehicles/:slug', (req, res) => {
    try {
      const vehicle = db.prepare('SELECT * FROM vehicles WHERE shareSlug = ? AND isPublic = 1').get(req.params.slug) as any;
      if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden oder nicht öffentlich.' });

      // Only allow public viewing if the owner is still Pro
      const owner = db.prepare('SELECT isPro, displayName, branding FROM users WHERE id = ?').get(vehicle.userId) as any;
      if (!owner?.isPro) {
        return res.status(403).json({ error: 'Der Verkaufsmodus dieses Fahrzeugs ist abgelaufen (PRO erforderlich).' });
      }

      const history = db.prepare('SELECT * FROM history WHERE vehicleId = ? ORDER BY date DESC').all(vehicle.id);
      const documents = db.prepare('SELECT * FROM documents WHERE vehicleId = ? ORDER BY date DESC').all(vehicle.id);

      res.json({
        ...vehicle,
        tasks: JSON.parse(vehicle.tasks || '[]'),
        history: (history as any[]).map(h => ({
          ...h,
          tasks: JSON.parse(h.tasks),
          attachments: [] 
        })),
        documents: (documents as any[]).map(d => ({
          ...d,
          attachments: []
        })),
        seller: {
          displayName: owner.displayName,
          branding: JSON.parse(owner.branding || '{}')
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Laden des öffentlichen Profils.' });
    }
  });

  app.patch('/api/auth/branding', authenticate, (req: any, res) => {
    const { branding } = req.body;
    try {
      const user = db.prepare('SELECT isPro FROM users WHERE id = ?').get(req.userId) as any;
      if (!user?.isPro) {
        return res.status(403).json({ error: 'Branding ist ein PRO-Feature.' });
      }

      db.prepare('UPDATE users SET branding = ? WHERE id = ?').run(JSON.stringify(branding), req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden.' });
    }
  });

  app.delete('/api/history/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM history WHERE id = ? AND userId = ?').run(req.params.id, req.userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.patch('/api/vehicles/:id/mileage', authenticate, (req: any, res) => {
    const { currentMileage } = req.body;
    try {
      db.prepare('UPDATE vehicles SET currentMileage = ? WHERE id = ? AND userId = ?').run(currentMileage, req.params.id, req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Admin & Stats (Aggregate data, no PII)
  app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    try {
      const vehicleCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as any;
      const serviceCount = db.prepare('SELECT COUNT(*) as count FROM history').get() as any;
      
      const historyItems = db.prepare('SELECT attachments FROM history').all() as any[];
      let attachmentCount = 0;
      historyItems.forEach(h => {
        try {
          const apps = JSON.parse(h.attachments || '[]');
          attachmentCount += apps.length;
        } catch(e) {}
      });

      const pdfExportCount = db.prepare('SELECT COUNT(*) as count FROM event_logs WHERE event_type = ?').get('pdf_export') as any;
      
      const recentEvents = db.prepare("SELECT event_type, COUNT(*) as count FROM event_logs WHERE timestamp > datetime('now', '-30 days') GROUP BY event_type").all();

      res.json({
        totals: {
          vehicles: vehicleCount.count,
          services: serviceCount.count,
          attachments: attachmentCount,
          pdfExports: pdfExportCount?.count || 0
        },
        recentActivity: recentEvents
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    try {
      const users = db.prepare('SELECT id, email, displayName, role, isPro, createdAt FROM users ORDER BY createdAt DESC').all();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Benutzerliste konnte nicht geladen werden.' });
    }
  });

  app.patch('/api/admin/users/:id/role', authenticateAdmin, (req: any, res) => {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Ungültige Rolle.' });
    
    try {
      const { id } = req.params;
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Rolle konnte nicht geändert werden.' });
    }
  });

  app.patch('/api/admin/users/:id/pro', authenticateAdmin, (req, res) => {
    const { isPro } = req.body;
    try {
      db.prepare('UPDATE users SET isPro = ? WHERE id = ?').run(isPro ? 1 : 0, req.params.id);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Pro-Status konnte nicht geändert werden.' });
    }
  });

  app.post('/api/auth/unlock-pro', authenticate, (req: any, res) => {
    try {
      db.prepare('UPDATE users SET isPro = 1 WHERE id = ?').run(req.userId);
      trackEvent('pro_unlock');
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Freischaltung fehlgeschlagen.' });
    }
  });

  app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
    try {
      const { id } = req.params;
      // Prevent deleting yourself
      if (id === (req as any).userId) {
        return res.status(400).json({ error: 'Du kannst deinen eigenen Admin-Account nicht löschen.' });
      }
      
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Benutzer konnte nicht gelöscht werden.' });
    }
  });

  app.post('/api/admin/track', (req, res) => {
    const { eventType } = req.body;
    if (eventType) {
      trackEvent(eventType);
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
