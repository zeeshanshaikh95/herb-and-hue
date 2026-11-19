import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seed } from './seed.js';

const force = process.argv.includes('--force');

try {
  await connectDatabase();
  await seed({ force });
  console.log('[seed] Complete.');
} catch (error) {
  console.error('[seed] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
