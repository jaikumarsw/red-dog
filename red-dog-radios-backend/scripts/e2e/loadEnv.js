const path = require('path');
const fs = require('fs');

/**
 * Loads env variables for E2E scripts.
 *
 * Priority:
 * - DOTENV_CONFIG_PATH if set (explicit)
 * - .env.e2e (if present)
 * - .env (fallback)
 *
 * Uses dotenv (already a backend dependency).
 */
function loadEnv() {
  // eslint-disable-next-line global-require
  const dotenv = require('dotenv');

  const backendRoot = path.resolve(__dirname, '..', '..');
  const explicit = process.env.DOTENV_CONFIG_PATH
    ? path.resolve(backendRoot, process.env.DOTENV_CONFIG_PATH)
    : null;

  const candidates = explicit
    ? [explicit]
    : [
        path.resolve(backendRoot, '.env.e2e'),
        path.resolve(backendRoot, '.env'),
      ];

  const envPath = candidates.find((p) => p && fs.existsSync(p));
  if (!envPath) {
    // Still allow process.env-only execution.
    // eslint-disable-next-line no-console
    console.warn('[e2e] No .env file found; using process.env only');
    return { envPath: null };
  }

  dotenv.config({ path: envPath });
  // eslint-disable-next-line no-console
  console.log(`[e2e] Loaded env from ${envPath}`);
  return { envPath };
}

module.exports = { loadEnv };

