-- ========================================================
-- RESTORE ALL 15 USERS TO NEW SUPABASE PROJECT
-- Run this in your NEW project: SQL Editor -> New Query -> Run
-- ========================================================

DO $$
DECLARE
  has_identities_id_default boolean;
BEGIN

  -- User: garv.anand777@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '3104054a-8115-4cd9-834c-efcb6819d907', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'garv.anand777@gmail.com', '$2a$10$M3kfl2ne3H2x5I4ARZmzne09SGROaER07lZ/qMYvT4y15pCm9qgd6', '2026-09-23T10:30:07.889992+00:00', '{"provider":"email","providers":["email","google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"109199830401595173982","name":"Garv Anand","email":"garv.anand777@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocIbsPjdhvznyv7LNzbNHmjIeIXuoOHHDLKcZr4uQt9HbZLkPQ=s96-c","full_name":"Garv Anand","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIbsPjdhvznyv7LNzbNHmjIeIXuoOHHDLKcZr4uQt9HbZLkPQ=s96-c","provider_id":"109199830401595173982","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-23T10:29:51.002718+00:00', '2026-10-09T19:20:48.084141+00:00', '2026-10-09T17:16:03.020522+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '3104054a-8115-4cd9-834c-efcb6819d907', '3104054a-8115-4cd9-834c-efcb6819d907', '{"sub":"3104054a-8115-4cd9-834c-efcb6819d907","email":"garv.anand777@gmail.com"}'::jsonb, 'email',
      '2026-10-09T17:16:03.020522+00:00', '2026-09-23T10:29:51.002718+00:00', '2026-10-09T19:20:48.084141+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '3104054a-8115-4cd9-834c-efcb6819d907', '3104054a-8115-4cd9-834c-efcb6819d907', '{"sub":"3104054a-8115-4cd9-834c-efcb6819d907","email":"garv.anand777@gmail.com"}'::jsonb, 'email',
        '2026-10-09T17:16:03.020522+00:00', '2026-09-23T10:29:51.002718+00:00', '2026-10-09T19:20:48.084141+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '109199830401595173982', '3104054a-8115-4cd9-834c-efcb6819d907', '{"iss":"https://accounts.google.com","sub":"109199830401595173982","name":"Garv Anand","email":"garv.anand777@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocIbsPjdhvznyv7LNzbNHmjIeIXuoOHHDLKcZr4uQt9HbZLkPQ=s96-c","full_name":"Garv Anand","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIbsPjdhvznyv7LNzbNHmjIeIXuoOHHDLKcZr4uQt9HbZLkPQ=s96-c","provider_id":"109199830401595173982","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-10-09T17:16:03.020522+00:00', '2026-09-23T10:29:51.002718+00:00', '2026-10-09T19:20:48.084141+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '109199830401595173982', '3104054a-8115-4cd9-834c-efcb6819d907', '{"iss":"https://accounts.google.com","sub":"109199830401595173982","name":"Garv Anand","email":"garv.anand777@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocIbsPjdhvznyv7LNzbNHmjIeIXuoOHHDLKcZr4uQt9HbZLkPQ=s96-c","full_name":"Garv Anand","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIbsPjdhvznyv7LNzbNHmjIeIXuoOHHDLKcZr4uQt9HbZLkPQ=s96-c","provider_id":"109199830401595173982","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-10-09T17:16:03.020522+00:00', '2026-09-23T10:29:51.002718+00:00', '2026-10-09T19:20:48.084141+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: kashish787038@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'fe1584c7-a3a7-4aa3-b00b-b47130a4fb37', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'kashish787038@gmail.com', '$2a$10$5G7iRYJuEwdt9OdiQl0HQOkRXz6pcPakY2DysjhOAI/5hNoMn57bi', '2026-09-22T08:38:50.798606+00:00', '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"fe1584c7-a3a7-4aa3-b00b-b47130a4fb37","email":"kashish787038@gmail.com","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-22T08:38:50.753768+00:00', '2026-09-22T08:38:50.844226+00:00', '2026-09-22T08:38:50.813219+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'fe1584c7-a3a7-4aa3-b00b-b47130a4fb37', 'fe1584c7-a3a7-4aa3-b00b-b47130a4fb37', '{"sub":"fe1584c7-a3a7-4aa3-b00b-b47130a4fb37","email":"kashish787038@gmail.com"}'::jsonb, 'email',
      '2026-09-22T08:38:50.813219+00:00', '2026-09-22T08:38:50.753768+00:00', '2026-09-22T08:38:50.844226+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'fe1584c7-a3a7-4aa3-b00b-b47130a4fb37', 'fe1584c7-a3a7-4aa3-b00b-b47130a4fb37', '{"sub":"fe1584c7-a3a7-4aa3-b00b-b47130a4fb37","email":"kashish787038@gmail.com"}'::jsonb, 'email',
        '2026-09-22T08:38:50.813219+00:00', '2026-09-22T08:38:50.753768+00:00', '2026-09-22T08:38:50.844226+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: garv.anand187@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'e1f037de-41f6-4ce0-9fc4-f90b4aa27d62', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'garv.anand187@gmail.com', '$2a$10$Bi32eNrkrOncZ0BlfvMz/OJ0TEThZ/xaAsvmxpj4yngdlv2wu7BIa', '2026-09-20T11:24:35.94771+00:00', '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"e1f037de-41f6-4ce0-9fc4-f90b4aa27d62","email":"garv.anand187@gmail.com","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-20T11:24:35.926025+00:00', '2026-09-23T09:48:12.589322+00:00', '2026-09-23T09:48:12.560071+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'e1f037de-41f6-4ce0-9fc4-f90b4aa27d62', 'e1f037de-41f6-4ce0-9fc4-f90b4aa27d62', '{"sub":"e1f037de-41f6-4ce0-9fc4-f90b4aa27d62","email":"garv.anand187@gmail.com"}'::jsonb, 'email',
      '2026-09-23T09:48:12.560071+00:00', '2026-09-20T11:24:35.926025+00:00', '2026-09-23T09:48:12.589322+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'e1f037de-41f6-4ce0-9fc4-f90b4aa27d62', 'e1f037de-41f6-4ce0-9fc4-f90b4aa27d62', '{"sub":"e1f037de-41f6-4ce0-9fc4-f90b4aa27d62","email":"garv.anand187@gmail.com"}'::jsonb, 'email',
        '2026-09-23T09:48:12.560071+00:00', '2026-09-20T11:24:35.926025+00:00', '2026-09-23T09:48:12.589322+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: ashutoshsinghnegi854@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'be4768dd-b218-4638-a1ca-0cbb8563ab9f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'ashutoshsinghnegi854@gmail.com', '$2a$10$V0UOE/9eL2Nw5ql7uAm9duhpBee6lVhGDucfdErfeoCv0NWKApTCK', '2026-09-24T13:25:25.937628+00:00', '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"be4768dd-b218-4638-a1ca-0cbb8563ab9f","email":"ashutoshsinghnegi854@gmail.com","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-24T13:25:11.490083+00:00', '2026-09-24T18:08:16.905388+00:00', '2026-09-24T13:25:25.945973+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'be4768dd-b218-4638-a1ca-0cbb8563ab9f', 'be4768dd-b218-4638-a1ca-0cbb8563ab9f', '{"sub":"be4768dd-b218-4638-a1ca-0cbb8563ab9f","email":"ashutoshsinghnegi854@gmail.com"}'::jsonb, 'email',
      '2026-09-24T13:25:25.945973+00:00', '2026-09-24T13:25:11.490083+00:00', '2026-09-24T18:08:16.905388+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'be4768dd-b218-4638-a1ca-0cbb8563ab9f', 'be4768dd-b218-4638-a1ca-0cbb8563ab9f', '{"sub":"be4768dd-b218-4638-a1ca-0cbb8563ab9f","email":"ashutoshsinghnegi854@gmail.com"}'::jsonb, 'email',
        '2026-09-24T13:25:25.945973+00:00', '2026-09-24T13:25:11.490083+00:00', '2026-09-24T18:08:16.905388+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: ayush080705@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '1427121b-efda-49c6-abdf-59ad35523935', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'ayush080705@gmail.com', '$2a$10$jYxf/5oNjrI/5kz6GK04eeDYFewF/9mfd6.sjX5ETWOOpZiLflJQS', '2026-09-20T09:02:15.427376+00:00', '{"provider":"email","providers":["email","google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"107205296977930137712","name":"Ayush Rai","email":"ayush080705@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLBtwtYqX7GXKWWndynuRh26bmPonzLPidGUki8eUZnmG13jOd5=s96-c","full_name":"Ayush Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLBtwtYqX7GXKWWndynuRh26bmPonzLPidGUki8eUZnmG13jOd5=s96-c","provider_id":"107205296977930137712","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-20T09:01:17.813983+00:00', '2026-10-09T21:21:21.588862+00:00', '2026-10-09T15:05:12.779438+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '1427121b-efda-49c6-abdf-59ad35523935', '1427121b-efda-49c6-abdf-59ad35523935', '{"sub":"1427121b-efda-49c6-abdf-59ad35523935","email":"ayush080705@gmail.com"}'::jsonb, 'email',
      '2026-10-09T15:05:12.779438+00:00', '2026-09-20T09:01:17.813983+00:00', '2026-10-09T21:21:21.588862+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '1427121b-efda-49c6-abdf-59ad35523935', '1427121b-efda-49c6-abdf-59ad35523935', '{"sub":"1427121b-efda-49c6-abdf-59ad35523935","email":"ayush080705@gmail.com"}'::jsonb, 'email',
        '2026-10-09T15:05:12.779438+00:00', '2026-09-20T09:01:17.813983+00:00', '2026-10-09T21:21:21.588862+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '107205296977930137712', '1427121b-efda-49c6-abdf-59ad35523935', '{"iss":"https://accounts.google.com","sub":"107205296977930137712","name":"Ayush Rai","email":"ayush080705@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLBtwtYqX7GXKWWndynuRh26bmPonzLPidGUki8eUZnmG13jOd5=s96-c","full_name":"Ayush Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLBtwtYqX7GXKWWndynuRh26bmPonzLPidGUki8eUZnmG13jOd5=s96-c","provider_id":"107205296977930137712","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-10-09T15:05:12.779438+00:00', '2026-09-20T09:01:17.813983+00:00', '2026-10-09T21:21:21.588862+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '107205296977930137712', '1427121b-efda-49c6-abdf-59ad35523935', '{"iss":"https://accounts.google.com","sub":"107205296977930137712","name":"Ayush Rai","email":"ayush080705@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLBtwtYqX7GXKWWndynuRh26bmPonzLPidGUki8eUZnmG13jOd5=s96-c","full_name":"Ayush Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLBtwtYqX7GXKWWndynuRh26bmPonzLPidGUki8eUZnmG13jOd5=s96-c","provider_id":"107205296977930137712","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-10-09T15:05:12.779438+00:00', '2026-09-20T09:01:17.813983+00:00', '2026-10-09T21:21:21.588862+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: devdutta1527b@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'devdutta1527b@gmail.com', '$2a$10$YUE9mYUBrFF71t4YEMZwpujvQdt8P2MuulpS1UgH4Dr1st35FbVHW', '2026-09-25T21:55:40.399832+00:00', '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7","email":"devdutta1527b@gmail.com","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-25T21:54:46.649982+00:00', '2026-09-26T15:15:47.961712+00:00', '2026-09-26T09:54:53.908022+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7', '938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7', '{"sub":"938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7","email":"devdutta1527b@gmail.com"}'::jsonb, 'email',
      '2026-09-26T09:54:53.908022+00:00', '2026-09-25T21:54:46.649982+00:00', '2026-09-26T15:15:47.961712+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7', '938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7', '{"sub":"938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7","email":"devdutta1527b@gmail.com"}'::jsonb, 'email',
        '2026-09-26T09:54:53.908022+00:00', '2026-09-25T21:54:46.649982+00:00', '2026-09-26T15:15:47.961712+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: abc@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'ba30de30-b7a5-4b57-b4ad-e73c53f1b48c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'abc@gmail.com', '$2a$10$uteSSFA6F0VcFkLS2Y1biOEjrt5Od0l4LGs6QugM0yXztU3.uklDO', '2026-09-20T11:13:49.794623+00:00', '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"ba30de30-b7a5-4b57-b4ad-e73c53f1b48c","email":"abc@gmail.com","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-20T11:13:49.761917+00:00', '2026-09-20T11:13:49.831881+00:00', '2026-09-20T11:13:49.801925+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'ba30de30-b7a5-4b57-b4ad-e73c53f1b48c', 'ba30de30-b7a5-4b57-b4ad-e73c53f1b48c', '{"sub":"ba30de30-b7a5-4b57-b4ad-e73c53f1b48c","email":"abc@gmail.com"}'::jsonb, 'email',
      '2026-09-20T11:13:49.801925+00:00', '2026-09-20T11:13:49.761917+00:00', '2026-09-20T11:13:49.831881+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'ba30de30-b7a5-4b57-b4ad-e73c53f1b48c', 'ba30de30-b7a5-4b57-b4ad-e73c53f1b48c', '{"sub":"ba30de30-b7a5-4b57-b4ad-e73c53f1b48c","email":"abc@gmail.com"}'::jsonb, 'email',
        '2026-09-20T11:13:49.801925+00:00', '2026-09-20T11:13:49.761917+00:00', '2026-09-20T11:13:49.831881+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: adhu@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '577609c4-486a-4a53-b6ea-99535f38cb53', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'adhu@gmail.com', '$2a$10$ens44bn8tXmJuhR.wfsHZ.O4BS9ANWPP0jqx8wiot1A89jaUCq5we', NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"577609c4-486a-4a53-b6ea-99535f38cb53","email":"adhu@gmail.com","email_verified":false,"phone_verified":false}'::jsonb,
    '2026-09-24T13:24:28.534928+00:00', '2026-09-24T13:24:31.650878+00:00', NULL, false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '577609c4-486a-4a53-b6ea-99535f38cb53', '577609c4-486a-4a53-b6ea-99535f38cb53', '{"sub":"577609c4-486a-4a53-b6ea-99535f38cb53","email":"adhu@gmail.com"}'::jsonb, 'email',
      NULL, '2026-09-24T13:24:28.534928+00:00', '2026-09-24T13:24:31.650878+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '577609c4-486a-4a53-b6ea-99535f38cb53', '577609c4-486a-4a53-b6ea-99535f38cb53', '{"sub":"577609c4-486a-4a53-b6ea-99535f38cb53","email":"adhu@gmail.com"}'::jsonb, 'email',
        NULL, '2026-09-24T13:24:28.534928+00:00', '2026-09-24T13:24:31.650878+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: ashu@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'd5ce4c13-43ee-4426-8fc8-521d646a98ee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'ashu@gmail.com', '$2a$10$YJ34RPeW8Ia5d9pUsW2Uuu9RhnC2zYIKgzS6guGhqLNDmR0jLzjby', '2026-09-22T13:39:26.068165+00:00', '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"d5ce4c13-43ee-4426-8fc8-521d646a98ee","email":"ashu@gmail.com","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-22T13:39:25.99675+00:00', '2026-09-24T13:23:20.900166+00:00', '2026-09-22T13:39:26.08268+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd5ce4c13-43ee-4426-8fc8-521d646a98ee', 'd5ce4c13-43ee-4426-8fc8-521d646a98ee', '{"sub":"d5ce4c13-43ee-4426-8fc8-521d646a98ee","email":"ashu@gmail.com"}'::jsonb, 'email',
      '2026-09-22T13:39:26.08268+00:00', '2026-09-22T13:39:25.99675+00:00', '2026-09-24T13:23:20.900166+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'd5ce4c13-43ee-4426-8fc8-521d646a98ee', 'd5ce4c13-43ee-4426-8fc8-521d646a98ee', '{"sub":"d5ce4c13-43ee-4426-8fc8-521d646a98ee","email":"ashu@gmail.com"}'::jsonb, 'email',
        '2026-09-22T13:39:26.08268+00:00', '2026-09-22T13:39:25.99675+00:00', '2026-09-24T13:23:20.900166+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: lol@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '40512f53-2a4c-4961-b071-13ec252f1615', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'lol@gmail.com', '$2a$10$qamLsBaVFDgW0/fl0NgH4OV2JLUi8nvk13TbOWbq2Qty.oNWzHV5C', NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"40512f53-2a4c-4961-b071-13ec252f1615","email":"lol@gmail.com","email_verified":false,"phone_verified":false}'::jsonb,
    '2026-09-29T08:03:01.251028+00:00', '2026-09-29T08:03:04.226983+00:00', NULL, false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '40512f53-2a4c-4961-b071-13ec252f1615', '40512f53-2a4c-4961-b071-13ec252f1615', '{"sub":"40512f53-2a4c-4961-b071-13ec252f1615","email":"lol@gmail.com"}'::jsonb, 'email',
      NULL, '2026-09-29T08:03:01.251028+00:00', '2026-09-29T08:03:04.226983+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '40512f53-2a4c-4961-b071-13ec252f1615', '40512f53-2a4c-4961-b071-13ec252f1615', '{"sub":"40512f53-2a4c-4961-b071-13ec252f1615","email":"lol@gmail.com"}'::jsonb, 'email',
        NULL, '2026-09-29T08:03:01.251028+00:00', '2026-09-29T08:03:04.226983+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: bhimsinghnegi178@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'ceda8c9c-bcfb-46b6-85b1-9eacd1a7560b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'bhimsinghnegi178@gmail.com', NULL, '2026-09-24T15:03:01.990366+00:00', '{"provider":"google","providers":["google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"115637052264796010480","name":"Ashutosh Singh Negi","email":"bhimsinghnegi178@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocIq1yy7Dxohz78yiROKxD5IFeWhRP5UmJtlN9mT3lYNqUnrSgMO=s96-c","full_name":"Ashutosh Singh Negi","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIq1yy7Dxohz78yiROKxD5IFeWhRP5UmJtlN9mT3lYNqUnrSgMO=s96-c","provider_id":"115637052264796010480","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-24T15:03:01.954073+00:00', '2026-09-24T15:03:02.036997+00:00', '2026-09-24T15:03:01.996818+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '115637052264796010480', 'ceda8c9c-bcfb-46b6-85b1-9eacd1a7560b', '{"iss":"https://accounts.google.com","sub":"115637052264796010480","name":"Ashutosh Singh Negi","email":"bhimsinghnegi178@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocIq1yy7Dxohz78yiROKxD5IFeWhRP5UmJtlN9mT3lYNqUnrSgMO=s96-c","full_name":"Ashutosh Singh Negi","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIq1yy7Dxohz78yiROKxD5IFeWhRP5UmJtlN9mT3lYNqUnrSgMO=s96-c","provider_id":"115637052264796010480","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-09-24T15:03:01.996818+00:00', '2026-09-24T15:03:01.954073+00:00', '2026-09-24T15:03:02.036997+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '115637052264796010480', 'ceda8c9c-bcfb-46b6-85b1-9eacd1a7560b', '{"iss":"https://accounts.google.com","sub":"115637052264796010480","name":"Ashutosh Singh Negi","email":"bhimsinghnegi178@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocIq1yy7Dxohz78yiROKxD5IFeWhRP5UmJtlN9mT3lYNqUnrSgMO=s96-c","full_name":"Ashutosh Singh Negi","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocIq1yy7Dxohz78yiROKxD5IFeWhRP5UmJtlN9mT3lYNqUnrSgMO=s96-c","provider_id":"115637052264796010480","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-09-24T15:03:01.996818+00:00', '2026-09-24T15:03:01.954073+00:00', '2026-09-24T15:03:02.036997+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: arai47821@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'bb7f0ecc-1919-4e13-b4f9-7b6ab67b58d0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'arai47821@gmail.com', NULL, '2026-09-24T18:42:29.937942+00:00', '{"provider":"google","providers":["google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"102715856392076967185","name":"Anushka Rai","email":"arai47821@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocKu-Ku975A1K86BIz1n5FtZgT03-J5YQrjWtZSSo0TOOezdAg=s96-c","full_name":"Anushka Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocKu-Ku975A1K86BIz1n5FtZgT03-J5YQrjWtZSSo0TOOezdAg=s96-c","provider_id":"102715856392076967185","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-24T18:42:29.911199+00:00', '2026-09-24T18:42:29.966922+00:00', '2026-09-24T18:42:29.953098+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '102715856392076967185', 'bb7f0ecc-1919-4e13-b4f9-7b6ab67b58d0', '{"iss":"https://accounts.google.com","sub":"102715856392076967185","name":"Anushka Rai","email":"arai47821@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocKu-Ku975A1K86BIz1n5FtZgT03-J5YQrjWtZSSo0TOOezdAg=s96-c","full_name":"Anushka Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocKu-Ku975A1K86BIz1n5FtZgT03-J5YQrjWtZSSo0TOOezdAg=s96-c","provider_id":"102715856392076967185","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-09-24T18:42:29.953098+00:00', '2026-09-24T18:42:29.911199+00:00', '2026-09-24T18:42:29.966922+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '102715856392076967185', 'bb7f0ecc-1919-4e13-b4f9-7b6ab67b58d0', '{"iss":"https://accounts.google.com","sub":"102715856392076967185","name":"Anushka Rai","email":"arai47821@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocKu-Ku975A1K86BIz1n5FtZgT03-J5YQrjWtZSSo0TOOezdAg=s96-c","full_name":"Anushka Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocKu-Ku975A1K86BIz1n5FtZgT03-J5YQrjWtZSSo0TOOezdAg=s96-c","provider_id":"102715856392076967185","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-09-24T18:42:29.953098+00:00', '2026-09-24T18:42:29.911199+00:00', '2026-09-24T18:42:29.966922+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: openthehellforme@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '63c27f6f-dccd-4800-9606-ffa2f8e332ca', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'openthehellforme@gmail.com', NULL, '2026-09-27T11:31:04.541651+00:00', '{"provider":"google","providers":["google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"117055121758644384528","name":"Open the","email":"openthehellforme@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLnR1siamIdtUUbtSdg5PM3oUBe1ugTAgfGFHszknbD_4QBhw=s96-c","full_name":"Open the","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLnR1siamIdtUUbtSdg5PM3oUBe1ugTAgfGFHszknbD_4QBhw=s96-c","provider_id":"117055121758644384528","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-09-27T11:31:04.517085+00:00', '2026-09-28T10:14:18.171488+00:00', '2026-09-27T11:31:04.548707+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '117055121758644384528', '63c27f6f-dccd-4800-9606-ffa2f8e332ca', '{"iss":"https://accounts.google.com","sub":"117055121758644384528","name":"Open the","email":"openthehellforme@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLnR1siamIdtUUbtSdg5PM3oUBe1ugTAgfGFHszknbD_4QBhw=s96-c","full_name":"Open the","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLnR1siamIdtUUbtSdg5PM3oUBe1ugTAgfGFHszknbD_4QBhw=s96-c","provider_id":"117055121758644384528","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-09-27T11:31:04.548707+00:00', '2026-09-27T11:31:04.517085+00:00', '2026-09-28T10:14:18.171488+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '117055121758644384528', '63c27f6f-dccd-4800-9606-ffa2f8e332ca', '{"iss":"https://accounts.google.com","sub":"117055121758644384528","name":"Open the","email":"openthehellforme@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLnR1siamIdtUUbtSdg5PM3oUBe1ugTAgfGFHszknbD_4QBhw=s96-c","full_name":"Open the","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLnR1siamIdtUUbtSdg5PM3oUBe1ugTAgfGFHszknbD_4QBhw=s96-c","provider_id":"117055121758644384528","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-09-27T11:31:04.548707+00:00', '2026-09-27T11:31:04.517085+00:00', '2026-09-28T10:14:18.171488+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: vanayushrai@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '91e4824b-829e-481a-b049-15f997998a07', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'vanayushrai@gmail.com', NULL, '2026-10-09T05:02:23.31879+00:00', '{"provider":"google","providers":["google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"110305386367863476334","name":"Vandana Rai","email":"vanayushrai@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLJcSrqUWqRAolJptR_2MRpf68qBVLSEONnePE1QhcwQKTpEw=s96-c","full_name":"Vandana Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLJcSrqUWqRAolJptR_2MRpf68qBVLSEONnePE1QhcwQKTpEw=s96-c","provider_id":"110305386367863476334","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-10-09T05:02:23.270044+00:00', '2026-10-09T05:02:23.391383+00:00', '2026-10-09T05:02:23.332868+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '110305386367863476334', '91e4824b-829e-481a-b049-15f997998a07', '{"iss":"https://accounts.google.com","sub":"110305386367863476334","name":"Vandana Rai","email":"vanayushrai@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLJcSrqUWqRAolJptR_2MRpf68qBVLSEONnePE1QhcwQKTpEw=s96-c","full_name":"Vandana Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLJcSrqUWqRAolJptR_2MRpf68qBVLSEONnePE1QhcwQKTpEw=s96-c","provider_id":"110305386367863476334","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-10-09T05:02:23.332868+00:00', '2026-10-09T05:02:23.270044+00:00', '2026-10-09T05:02:23.391383+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '110305386367863476334', '91e4824b-829e-481a-b049-15f997998a07', '{"iss":"https://accounts.google.com","sub":"110305386367863476334","name":"Vandana Rai","email":"vanayushrai@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocLJcSrqUWqRAolJptR_2MRpf68qBVLSEONnePE1QhcwQKTpEw=s96-c","full_name":"Vandana Rai","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocLJcSrqUWqRAolJptR_2MRpf68qBVLSEONnePE1QhcwQKTpEw=s96-c","provider_id":"110305386367863476334","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-10-09T05:02:23.332868+00:00', '2026-10-09T05:02:23.270044+00:00', '2026-10-09T05:02:23.391383+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- User: dev1527b@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    last_sign_in_at, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    'c2f47b61-48cd-4a5b-90cd-7bc319b914b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'dev1527b@gmail.com', NULL, '2026-10-09T14:13:48.237117+00:00', '{"provider":"google","providers":["google"]}'::jsonb, '{"iss":"https://accounts.google.com","sub":"113486398530699168408","name":"Devdutta Nath","email":"dev1527b@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocJc-arByJMqdPgoG_9DXMiJtCpzz4QVkDHTdQ9bpiDJ1yQdqNEP=s96-c","full_name":"Devdutta Nath","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocJc-arByJMqdPgoG_9DXMiJtCpzz4QVkDHTdQ9bpiDJ1yQdqNEP=s96-c","provider_id":"113486398530699168408","email_verified":true,"phone_verified":false}'::jsonb,
    '2026-10-09T14:13:48.209984+00:00', '2026-10-09T14:13:48.248461+00:00', '2026-10-09T14:13:48.242271+00:00', false, false, false
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  BEGIN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '113486398530699168408', 'c2f47b61-48cd-4a5b-90cd-7bc319b914b3', '{"iss":"https://accounts.google.com","sub":"113486398530699168408","name":"Devdutta Nath","email":"dev1527b@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocJc-arByJMqdPgoG_9DXMiJtCpzz4QVkDHTdQ9bpiDJ1yQdqNEP=s96-c","full_name":"Devdutta Nath","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocJc-arByJMqdPgoG_9DXMiJtCpzz4QVkDHTdQ9bpiDJ1yQdqNEP=s96-c","provider_id":"113486398530699168408","email_verified":true,"phone_verified":false}'::jsonb, 'google',
      '2026-10-09T14:13:48.242271+00:00', '2026-10-09T14:13:48.209984+00:00', '2026-10-09T14:13:48.248461+00:00'
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If table requires explicit identity id
    BEGIN
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '113486398530699168408', 'c2f47b61-48cd-4a5b-90cd-7bc319b914b3', '{"iss":"https://accounts.google.com","sub":"113486398530699168408","name":"Devdutta Nath","email":"dev1527b@gmail.com","picture":"https://lh3.googleusercontent.com/a/ACg8ocJc-arByJMqdPgoG_9DXMiJtCpzz4QVkDHTdQ9bpiDJ1yQdqNEP=s96-c","full_name":"Devdutta Nath","avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocJc-arByJMqdPgoG_9DXMiJtCpzz4QVkDHTdQ9bpiDJ1yQdqNEP=s96-c","provider_id":"113486398530699168408","email_verified":true,"phone_verified":false}'::jsonb, 'google',
        '2026-10-09T14:13:48.242271+00:00', '2026-10-09T14:13:48.209984+00:00', '2026-10-09T14:13:48.248461+00:00'
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

END $$;
