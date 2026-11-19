/**
 * Resolves a local package binary and runs it with the current Node binary.
 *
 * This keeps npm scripts working in workspaces whose absolute path contains
 * shell metacharacters (the npm Windows shim splits PATH on "&"). It also works
 * unchanged on Linux hosts because resolution is relative to this file.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const PACKAGE_BY_COMMAND = {
  tsc: 'typescript',
  vite: 'vite',
  vitest: 'vitest',
  tsx: 'tsx',
  concurrently: 'concurrently',
};

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/run.mjs <command> [args...]');
  process.exit(1);
}

const require = createRequire(import.meta.url);
let binaryPath;
try {
  const packageName = PACKAGE_BY_COMMAND[command] ?? command;
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const packageJson = require(packageJsonPath);
  const binField = packageJson.bin;
  const relativeBin =
    typeof binField === 'string'
      ? binField
      : binField?.[command] ?? (binField ? Object.values(binField)[0] : null);
  if (!relativeBin) throw new Error(`No binary declared for ${packageName}`);
  binaryPath = path.join(path.dirname(packageJsonPath), relativeBin);
} catch (error) {
  console.error(`[run] Could not resolve "${command}": ${error.message}`);
  process.exit(1);
}

const child = spawn(process.execPath, [binaryPath, ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
  windowsHide: false,
});

child.on('error', (error) => {
  console.error(`[run] Failed to start ${command}: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
