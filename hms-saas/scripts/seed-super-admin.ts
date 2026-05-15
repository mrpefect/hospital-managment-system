/**
 * Seeds the first super admin account.
 * Run once after deploying migrations:
 *   npx tsx scripts/seed-super-admin.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL!
const SUPER_ADMIN_PASS  = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe@123'
const SUPER_ADMIN_NAME  = process.env.SUPER_ADMIN_NAME     || 'Platform Admin'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPER_ADMIN_EMAIL) {
  console.error('❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_EMAIL')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\n🌱  Seeding super admin: ${SUPER_ADMIN_EMAIL}\n`)

  // 1. Create auth user (or fetch existing)
  const { data: existingUser } = await supabase
    .from('super_admins')
    .select('id, email')
    .eq('email', SUPER_ADMIN_EMAIL)
    .single()

  if (existingUser) {
    console.log(`✅  Super admin already exists (${existingUser.email}). Nothing to do.`)
    process.exit(0)
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:             SUPER_ADMIN_EMAIL,
    password:          SUPER_ADMIN_PASS,
    email_confirm:     true,              // skip email verification for seed
    user_metadata: {
      full_name: SUPER_ADMIN_NAME,
    },
  })

  if (authError) {
    // If user already exists in auth, fetch them
    if (authError.message.includes('already been registered')) {
      console.log('⚠️   Auth user already exists, looking up…')
      const { data: users } = await supabase.auth.admin.listUsers()
      const existing = users?.users.find(u => u.email === SUPER_ADMIN_EMAIL)
      if (!existing) {
        console.error('❌  Could not find existing auth user.')
        process.exit(1)
      }
      await insertSuperAdminRecord(existing.id)
    } else {
      console.error('❌  Auth user creation failed:', authError.message)
      process.exit(1)
    }
  } else {
    await insertSuperAdminRecord(authData.user.id)
  }
}

async function insertSuperAdminRecord(authUserId: string) {
  const { error } = await supabase.from('super_admins').insert({
    auth_user_id: authUserId,
    full_name:    SUPER_ADMIN_NAME,
    email:        SUPER_ADMIN_EMAIL,
    role:         'super_admin',
    is_active:    true,
  })

  if (error) {
    if (error.code === '23505') {
      console.log('✅  super_admins record already exists.')
    } else {
      console.error('❌  Failed to insert super_admins record:', error.message)
      process.exit(1)
    }
  } else {
    console.log('✅  super_admins record created.')
  }

  console.log('\n🎉  Done!\n')
  console.log(`   Email    : ${SUPER_ADMIN_EMAIL}`)
  console.log(`   Password : ${SUPER_ADMIN_PASS}`)
  console.log('\n   ⚠️  Change the password after first login.\n')
}

main()
