import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), '.env');
const secretsPath = path.resolve(process.cwd(), 'secrets.json');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

console.log('📖 Reading .env file...');
const envContent = fs.readFileSync(envPath, 'utf-8');
const secrets = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim();
    // Remove quotes if present
    const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
    secrets[key.trim()] = cleanValue;
  }
});

fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2));
console.log(`✅ Generated secrets.json with ${Object.keys(secrets).length} secrets.`);
console.log('🚀 Ready to upload to Cloudflare Pages.');
