import mongoose from 'mongoose';
import { config } from './env.js';
let memoryServer = null;
export async function connectDatabase(uriOverride) {
    if (mongoose.connection.readyState === 1)
        return;
    let uri = uriOverride ?? config.mongodbUri ?? undefined;
    if (!uri) {
        if (config.isProduction) {
            throw new Error('MONGODB_URI is required in production');
        }
        // Development convenience: no local mongod required. This is never used in
        // production and is clearly announced so it cannot be mistaken for Atlas.
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const server = await MongoMemoryServer.create();
        memoryServer = server;
        uri = server.getUri();
        console.warn('[database] MONGODB_URI not set — started an in-memory MongoDB for development only. Data is discarded on exit.');
    }
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15_000,
        maxPoolSize: 10,
    });
    console.log(`[database] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}
export async function disconnectDatabase() {
    await mongoose.connection.close();
    if (memoryServer) {
        await memoryServer.stop();
        memoryServer = null;
    }
}
export function databaseStatus() {
    const state = mongoose.connection.readyState;
    if (state === 1)
        return 'connected';
    if (state === 2)
        return 'connecting';
    return 'disconnected';
}
//# sourceMappingURL=database.js.map