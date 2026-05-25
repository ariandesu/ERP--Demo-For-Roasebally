const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Manually parse .env.local variables to avoid extra dependencies
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found. Please configure your environment variables first.');
  process.exit(1);
}

const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    // Strip surrounding quotes if present
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val.trim();
  }
});

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

// 2. Initialize Supabase Admin client
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log('Connecting to Supabase at:', env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Seeding initial Super Admin account: admin@rosebally.com...');

  try {
    // A. Create User in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@rosebally.com',
      password: 'admin1234',
      email_confirm: true,
      user_metadata: { name: 'Super Admin' }
    });

    if (authError) {
      if (authError.message.includes('already exists') || authError.message.includes('conflict')) {
        console.log('\nResult: The account admin@rosebally.com already exists in your Supabase Auth.');
        
        // Try inserting profile in case user exists but profile was skipped/failed
        console.log('Attempting to create matching public profile...');
        
        // Find existing user id
        const { data: listUsers } = await supabase.auth.admin.listUsers();
        const existingUser = listUsers.users.find(u => u.email === 'admin@rosebally.com');
        
        if (existingUser) {
          await insertProfile(existingUser.id);
        } else {
          console.log('Could not find existing user ID in Auth directory.');
        }
      } else {
        console.error('\nError: Failed to create user account.', authError.message);
      }
      return;
    }

    // B. Insert Profile programmatically
    await insertProfile(authData.user.id);

  } catch (err) {
    console.error('Unexpected exception during seed run:', err.message);
  }
}

async function insertProfile(userId) {
  console.log('Inserting Super Admin profile details...');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: 'Super Admin',
      email: 'admin@rosebally.com',
      role: 'super_admin',
      status: 'active',
      warehouse_access: ['HQ', 'MAIN'],
      dashboard_access: true,
      materials_access: true,
      goods_inward_access: true,
      goods_outward_access: true,
      reports_access: true,
      purchase_orders_access: true,
      analytics_access: true,
      settings_access: true,
      user_management_access: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('Error seeding public profile details:', profileError.message);
    console.log('\nTroubleshooting Tip: Make sure you ran the table creation script in your Supabase SQL editor.');
  } else {
    console.log('\nSuccess! Super Admin account and database profile provisioned.');
    console.log('\nYou can now log in at http://localhost:3000 using:');
    console.log('Email:    admin@rosebally.com');
    console.log('Password: admin1234');
  }
}

seed();
