const fs = require('fs');
const users = JSON.parse(fs.readFileSync('users_backup.json', 'utf8'));

let sql = `-- ========================================================
-- RESTORE ALL 15 USERS TO NEW SUPABASE PROJECT
-- Run this in your NEW project: SQL Editor -> New Query -> Run
-- ========================================================

DO $$
DECLARE
  has_identities_id_default boolean;
BEGIN

`;

for (const u of users) {
  const encPass = u.encrypted_password ? `'${u.encrypted_password}'` : 'NULL';
  const emailConf = u.email_confirmed_at ? `'${u.email_confirmed_at}'` : 'NULL';
  const confAt = u.confirmed_at ? `'${u.confirmed_at}'` : (emailConf !== 'NULL' ? emailConf : 'NULL');
  const appMeta = JSON.stringify(u.raw_app_meta_data || {}).split("'").join("''");
  const userMeta = JSON.stringify(u.raw_user_meta_data || {}).split("'").join("''");
  const createdAt = u.created_at ? `'${u.created_at}'` : 'now()';
  const updatedAt = u.updated_at ? `'${u.updated_at}'` : 'now()';
  const lastSignIn = u.last_sign_in_at ? `'${u.last_sign_in_at}'` : 'NULL';

  sql += `  -- User: ${u.email}\n`;
  sql += `  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '${u.id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    '${u.email}', ${encPass}, ${emailConf}, '${appMeta}'::jsonb, '${userMeta}'::jsonb,
    ${createdAt}, ${updatedAt}, ${lastSignIn}, false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;\n\n`;

  // Identities
  const providers = (u.raw_app_meta_data && u.raw_app_meta_data.providers) || ['email'];
  for (const prov of providers) {
    let provId = u.id;
    let identData = { sub: u.id, email: u.email };
    if (prov === 'google' && u.raw_user_meta_data && u.raw_user_meta_data.sub) {
      provId = u.raw_user_meta_data.sub;
      identData = u.raw_user_meta_data;
    }
    const identDataStr = JSON.stringify(identData).split("'").join("''");
    
    // Check if id column exists and needs a value
    sql += `  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '${provId}', '${u.id}', '${identDataStr}'::jsonb, '${prov}',
      ${lastSignIn}, ${createdAt}, ${updatedAt}
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '${provId}', '${u.id}', '${identDataStr}'::jsonb, '${prov}',
        ${lastSignIn}, ${createdAt}, ${updatedAt}
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;\n\n`;
  }
}

sql += `END $$;\n`;

fs.writeFileSync('restore_users.sql', sql);
console.log('Successfully wrote robust restore_users.sql!');
