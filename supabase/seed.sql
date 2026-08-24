-- Local test identities. Not for production.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'comprador@local.test',
    extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana López"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'elpino@local.test',
    extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dueña El Pino"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'canasta@local.test',
    extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dueño Canasta"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'operador@local.test',
    extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Operación local"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub', '10000000-0000-0000-0000-000000000001',
      'email', 'comprador@local.test'
    ),
    'email',
    '10000000-0000-0000-0000-000000000001',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000002',
    jsonb_build_object(
      'sub', '10000000-0000-0000-0000-000000000002',
      'email', 'elpino@local.test'
    ),
    'email',
    '10000000-0000-0000-0000-000000000002',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000003',
    jsonb_build_object(
      'sub', '10000000-0000-0000-0000-000000000003',
      'email', 'canasta@local.test'
    ),
    'email',
    '10000000-0000-0000-0000-000000000003',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000004',
    jsonb_build_object(
      'sub', '10000000-0000-0000-0000-000000000004',
      'email', 'operador@local.test'
    ),
    'email',
    '10000000-0000-0000-0000-000000000004',
    now(),
    now(),
    now()
  );

insert into public.operator_members (user_id)
values ('10000000-0000-0000-0000-000000000004');

insert into public.seller_presences (
  id, owner_id, name, slug, description, kind, whatsapp_e164,
  served_city, location, location_public_confirmed, status
) values
  (
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000002',
    'Pulpería El Pino',
    'el-pino',
    'Pulpería de barrio en Siguatepeque. Pin público del negocio.',
    'physical',
    '+50499991111',
    'Siguatepeque',
    extensions.st_point(-87.8310, 14.5969)::extensions.geography,
    true,
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000003',
    'La Canasta Virtual',
    'la-canasta-virtual',
    'Atiende Siguatepeque por WhatsApp. Sin ubicación en el mapa.',
    'virtual',
    '+50499992222',
    'Siguatepeque',
    null,
    false,
    'published'
  );

insert into public.offers (
  id, presence_id, slug, kind, title, description,
  price_cents, price_mode, unit, availability, confirmed_at, status
) values
  (
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000010',
    'zambos-picantes-el-pino',
    'product',
    'Zambos picantes',
    'Bolsa de zambos con chile, receta de sábado de mercado.',
    3500,
    'fixed',
    'bolsa',
    'available',
    now(),
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000010',
    'queso-seco-el-pino',
    'product',
    'Queso seco',
    'Queso seco de la zona. El peso se confirma al pedir.',
    8000,
    'from',
    'libra',
    'available',
    now(),
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000022',
    '10000000-0000-0000-0000-000000000011',
    'zambos-picantes-canasta',
    'product',
    'Zambos picantes',
    'Zambos picantes por encargo. Conviene confirmar existencia.',
    3200,
    'from',
    'bolsa',
    'available',
    now() - interval '12 days',
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000023',
    '10000000-0000-0000-0000-000000000011',
    'queso-seco-canasta',
    'product',
    'Queso seco',
    'Queso seco empacado. Precio publicado por libra.',
    7500,
    'fixed',
    'libra',
    'available',
    now() - interval '12 days',
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000024',
    '10000000-0000-0000-0000-000000000010',
    'pan-de-yema-el-pino',
    'product',
    'Pan de yema',
    'No disponible hoy. Sigue visible en la pulpería.',
    1200,
    'fixed',
    'unidad',
    'unavailable',
    now() - interval '40 days',
    'published'
  );
