import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for .env.production first, then fall back to .env
const envProductionPath = path.resolve(process.cwd(), '.env.production');
const envDefaultPath = path.resolve(process.cwd(), '.env');

let envPath = envDefaultPath;
if (fs.existsSync(envProductionPath)) {
  console.log('qm Found .env.production, using it for deployment secrets...');
  envPath = envProductionPath;
} else if (fs.existsSync(envDefaultPath)) {
  console.log('qm Using default .env for deployment secrets...');
} else {
  console.error('❌ No .env or .env.production file found!');
  process.exit(1);
}

const secretsPath = path.resolve(process.cwd(), 'secrets.json');

console.log('📖 Reading .env file...');
const envContent = fs.readFileSync(envPath, 'utf-8');
const secrets = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;

  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    const keyTrimmed = key.trim();
    // Skip NODE_ENV as it is handled by wrangler.toml for production
    if (keyTrimmed === 'NODE_ENV') return;

    const value = valueParts.join('=').trim();
    // Remove quotes if present
    const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
    secrets[key.trim()] = cleanValue;
  }
});

fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2));
console.log(`✅ Generated secrets.json with ${Object.keys(secrets).length} secrets.`);
console.log('🚀 Ready to upload to Cloudflare Pages.');
