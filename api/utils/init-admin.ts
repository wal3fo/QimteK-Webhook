/**
 * Initialize Admin Account
 * 
 * Creates the default admin account on first database initialization
 */

import { supabase } from '../lib/supabase.js';
import { hashPassword } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = 'owner@qimtek.ma';
const ADMIN_PASSWORD = 'benjaber';

/**
 * Initialize admin account if it doesn't exist
 */
export async function initAdminAccount(): Promise<void> {
  try {
    // Check for duplicate admin accounts and clean them up
    // Supabase doesn't support case-insensitive unique constraint by default on email unless configured
    // so we search case-insensitive
    const { data: adminResults, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', ADMIN_EMAIL);

    if (error) {
      console.error('❌ Failed to check for admin account:', error);
      return;
    }

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
          await supabase.from('users').delete().eq('id', dup.id);
        }
        console.log('✅ Duplicate admin accounts removed.');
      }

      // Check if role needs update (e.g. migration from 'admin' to 'Administrator')
      if (primaryAdmin.role !== 'Administrator') {
        console.log('🔄 Updating admin role to Administrator and resetting password');
        const passwordHash = await hashPassword(ADMIN_PASSWORD);
        await supabase
          .from('users')
          .update({ role: 'Administrator', password_hash: passwordHash })
          .eq('id', primaryAdmin.id);
        console.log('✅ Admin role updated to Administrator and password reset');
      } else {
        console.log('✅ Admin account already exists and is valid');
      }
      return;
    }

    // Create admin account
    const adminId = uuidv4();
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: adminId,
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role: 'Administrator',
        is_verified: true,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Failed to create admin account:', insertError);
      return;
    }

    console.log('✅ Admin account created successfully');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('❌ Failed to initialize admin account:', error);
    // Don't throw - allow app to continue even if admin creation fails
  }
}
