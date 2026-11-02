import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/** Remove DB folders left behind by in-memory instances that were killed. */
function cleanupStaleMemoryDirs() {
  try {
    const tmp = os.tmpdir();
    fs.readdirSync(tmp)
      .filter((name) => name.startsWith('mongo-mem-'))
      .forEach((name) => fs.rmSync(path.join(tmp, name), { recursive: true, force: true }));
  } catch {
    /* not fatal */
  }
}

/**
 * Connects to MongoDB.
 * 1. Uses MONGODB_URI (MongoDB Atlas / local) when provided.
 * 2. Falls back to an in-memory MongoDB so the app runs with zero setup.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);

  if (env.mongoUri) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log('✅ MongoDB connected (external URI)');
      return { mode: 'external' };
    } catch (err) {
      console.error('⚠️  Could not reach MONGODB_URI:', err.message);
      if (!env.allowMemoryDb) throw err;
      console.error('   Falling back to in-memory MongoDB for this session.');
    }
  }

  if (!env.allowMemoryDb) {
    throw new Error('No MONGODB_URI configured and ALLOW_MEMORY_DB is disabled.');
  }

  // Lazy import so production installs can skip the dev dependency.
  cleanupStaleMemoryDirs();
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri('leadflow'));
  console.log('✅ In-memory MongoDB started (demo mode — data resets on restart)');
  return { mode: 'memory' };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

export const dbMode = () => (memoryServer ? 'memory' : 'external');
