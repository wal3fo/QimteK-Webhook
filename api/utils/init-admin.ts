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

    // Check for duplicate admin accounts and clean them up
    const existingAdmins = database.prepare(`
      SELECT * FROM users WHERE lower(email) = ?
    `).all(ADMIN_EMAIL);

    const adminResults = await (existingAdmins instanceof Promise
      ? existingAdmins
      : Promise.resolve(existingAdmins));

    if (adminResults && adminResults.length > 0) {
      // Sort by creation time (oldest first)
      const sortedAdmins = adminResults.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const primaryAdmin = sortedAdmins[0];

      // Remove duplicates if any
      if (sortedAdmins.length > 1) {
        console.log(`⚠️ Found ${sortedAdmins.length} admin accounts. Cleaning up duplicates...`);
        for (let i = 1; i < sortedAdmins.length; i++) {
          const dup = sortedAdmins[i];
          console.log(`   Deleting duplicate admin: ${dup.id} (${dup.email})`);
          const deleteStmt = database.prepare('DELETE FROM users WHERE id = ?');
          const deleteResult = deleteStmt.run(dup.id);
          await (deleteResult instanceof Promise ? deleteResult : Promise.resolve(deleteResult));
        }
        console.log('✅ Duplicate admin accounts removed.');
      }

      // Check if role needs update (e.g. migration from 'admin' to 'Administrator')
      if (primaryAdmin.role !== 'Administrator') {
        console.log('🔄 Updating admin role to Administrator and resetting password');
        const passwordHash = await hashPassword(ADMIN_PASSWORD);
        const updateStmt = database.prepare('UPDATE users SET role = ?, password_hash = ? WHERE id = ?');
        const updateResult = updateStmt.run('Administrator', passwordHash, primaryAdmin.id);
        await (updateResult instanceof Promise ? updateResult : Promise.resolve(updateResult));
        console.log('✅ Admin role updated to Administrator and password reset');
      } else {
        console.log('✅ Admin account already exists and is valid');
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
