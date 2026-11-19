import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

/**
 * Every API test runs against a throwaway in-memory MongoDB. Nothing here can
 * touch a developer database or production Atlas cluster.
 */
let mongo: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.NODE_ENV = 'test';
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongo.getUri(), { serverSelectionTimeoutMS: 15_000 });
  // Unique indexes are what the duplicate-slug tests rely on.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
}, 120_000);

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}, 60_000);
