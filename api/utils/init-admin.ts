/**
 * Initialize Admin Account
 * 
 * Creates the default admin account on first database initialization
 */

import { ensureDb } from '../db.js';
import { hashPassword } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = 'owner@qimtek.ma';
const ADMIN_PASSWORD = 'benjaber';

/**
 * Initialize admin account if it doesn't exist
 */
export async function initAdminAccount(): Promise<void> {
  try {
    const database = await ensureDb();

    // Check if admin already exists (case insensitive)
    const existingAdmin = database.prepare(`
      SELECT * FROM users WHERE lower(email) = ?
    `).get(ADMIN_EMAIL);

    const adminResult = await (existingAdmin instanceof Promise
      ? existingAdmin
      : Promise.resolve(existingAdmin));

    if (adminResult) {
      // Check if role needs update (e.g. migration from 'admin' to 'Administrator')
      if (adminResult.role !== 'Administrator') {
        console.log('🔄 Updating admin role to Administrator and resetting password');
        const passwordHash = await hashPassword(ADMIN_PASSWORD);
        const updateStmt = database.prepare('UPDATE users SET role = ?, password_hash = ? WHERE id = ?');
        const updateResult = updateStmt.run('Administrator', passwordHash, adminResult.id);
        await (updateResult instanceof Promise ? updateResult : Promise.resolve(updateResult));
        console.log('✅ Admin role updated to Administrator and password reset');
      } else {
        console.log('✅ Admin account already exists');
      }
      return;
    }

    // Create admin account
    const adminId = uuidv4();
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    const stmt = database.prepare(`
      INSERT INTO users (id, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(adminId, ADMIN_EMAIL, passwordHash, 'Administrator');
    await (result instanceof Promise ? result : Promise.resolve(result));

    console.log('✅ Admin account created successfully');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('❌ Failed to initialize admin account:', error);
    // Don't throw - allow app to continue even if admin creation fails
  }
}
