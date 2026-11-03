import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env.js';
import { connectDB, dbMode } from './config/db.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/users.js';
import spendRoutes from './routes/spend.js';
import { seedAdmin, seedDemoLeads } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);
app.use(
  cors({
    // Landing pages on other domains must be able to post leads here.
    origin: true,
    credentials: false,
  })
);
// Vehicle photos are sent as data URLs, so allow a bigger payload.
app.use(express.json({ limit: '8mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: dbMode(), uptime: process.uptime(), time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spend', spendRoutes);

// Serve the built React app when it exists (npm run build in /client).
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

async function start() {
  await connectDB();

  const admin = await seedAdmin();
  console.log(
    admin.created
      ? `👤 Admin created → ${env.admin.email} / ${env.admin.password}`
      : `👤 Admin exists → ${admin.email}`
  );

  if (env.seedDemo) {
    const seeded = await seedDemoLeads();
    if (seeded.inserted) console.log(`🌱 Seeded ${seeded.inserted} demo leads`);
    if (seeded.telecaller) console.log(`👥 Demo telecaller → ${seeded.telecaller}`);
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`🚀 API listening on http://localhost:${env.port}  (db: ${dbMode()})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
