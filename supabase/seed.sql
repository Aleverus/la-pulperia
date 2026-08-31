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
  id, owner_id, name, slug, description, mode, whatsapp_e164,
  served_city, coverage_label, service_territory, location,
  location_public_confirmed, status, whatsapp_verification_status,
  whatsapp_verified_at
) values
  (
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000002',
    'Pulpería El Pino',
    'el-pino',
    'Pulpería de barrio en Siguatepeque. Pin público del negocio.',
    'fixed_location',
    '+50499991111',
    'Siguatepeque',
    null,
    null,
    extensions.st_point(-87.8310, 14.5969)::extensions.geography,
    true,
    'published',
    'verified',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000003',
    'La Canasta Móvil',
    'la-canasta-virtual',
    'Fixture local móvil con ofertas de prueba. Sin ubicación en el mapa.',
    'mobile',
    '+50499992222',
    'Siguatepeque',
    'Siguatepeque; confirmar cobertura con el vendedor',
    null,
    null,
    false,
    'published',
    'verified',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000003',
    'Diseño Remoto Siguatepeque',
    'diseno-remoto-siguatepeque',
    'Fixture local de atención remota. Sin ubicación ni cobertura física inventada.',
    'remote',
    '+50499993333',
    'Siguatepeque',
    null,
    'Siguatepeque y atención digital en Honduras',
    null,
    false,
    'published',
    'verified',
    now()
  );

insert into public.offers (
  id, presence_id, slug, offer_class, title, description,
  price_cents, price_mode, unit, availability_model, availability_state,
  availability_details, confirmed_at, status
) values
  (
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000010',
    'zambos-picantes-el-pino',
    'stocked_product',
    'Zambos picantes',
    'Bolsa de zambos con chile, receta de sábado de mercado.',
    3500,
    'fixed',
    'bolsa',
    'stock',
    'available',
    '{}'::jsonb,
    now(),
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000010',
    'queso-seco-el-pino',
    'stocked_product',
    'Queso seco',
    'Queso seco de la zona. El peso se confirma al pedir.',
    8000,
    'from',
    'libra',
    'stock',
    'available',
    '{}'::jsonb,
    now(),
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000022',
    '10000000-0000-0000-0000-000000000011',
    'zambos-picantes-canasta',
    'stocked_product',
    'Zambos picantes',
    'Zambos picantes por encargo. Conviene confirmar existencia.',
    3200,
    'from',
    'bolsa',
    'stock',
    'available',
    '{}'::jsonb,
    now() - interval '40 days',
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000023',
    '10000000-0000-0000-0000-000000000011',
    'queso-seco-canasta',
    'stocked_product',
    'Queso seco',
    'Queso seco empacado. Precio publicado por libra.',
    7500,
    'fixed',
    'libra',
    'stock',
    'available',
    '{}'::jsonb,
    now() - interval '12 days',
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000024',
    '10000000-0000-0000-0000-000000000010',
    'pan-de-yema-el-pino',
    'stocked_product',
    'Pan de yema',
    'No disponible hoy. Sigue visible en la pulpería.',
    1200,
    'fixed',
    'unidad',
    'stock',
    'unavailable',
    '{}'::jsonb,
    now() - interval '40 days',
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000025',
    '10000000-0000-0000-0000-000000000011',
    'pan-por-encargo-canasta',
    'scheduled_food',
    'Pan por encargo',
    'Fixture de comida con una ventana y corte explícitos.',
    1200,
    'fixed',
    'unidad',
    'window',
    'available',
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00","cutoff_at":"2030-01-10T12:00:00-06:00","capacity_note":"Cupo de prueba"}'::jsonb,
    now(),
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000026',
    '10000000-0000-0000-0000-000000000011',
    'armado-canastas-evento',
    'local_service',
    'Armado de canastas para evento',
    'Fixture de servicio local que requiere alcance y cita.',
    null,
    'quote',
    null,
    'schedule',
    'available',
    '{"schedule_note":"Horario a confirmar con el vendedor"}'::jsonb,
    now(),
    'draft'
  ),
  (
    '10000000-0000-0000-0000-000000000027',
    '10000000-0000-0000-0000-000000000012',
    'tarjeta-digital-fixture',
    'digital_offer',
    'Tarjeta digital para evento',
    'Fixture remoto bajo solicitud con entrega fuera de la plataforma.',
    null,
    'quote',
    null,
    'on_request',
    'on_request',
    '{"requirements":"Describir texto, formato y fecha deseada"}'::jsonb,
    now(),
    'draft'
  );

insert into public.offer_fulfillment_modes (offer_id, mode) values
  ('10000000-0000-0000-0000-000000000020', 'direct_agreement'),
  ('10000000-0000-0000-0000-000000000021', 'direct_agreement'),
  ('10000000-0000-0000-0000-000000000022', 'direct_agreement'),
  ('10000000-0000-0000-0000-000000000023', 'direct_agreement'),
  ('10000000-0000-0000-0000-000000000024', 'direct_agreement'),
  ('10000000-0000-0000-0000-000000000025', 'local_coverage'),
  ('10000000-0000-0000-0000-000000000026', 'appointment'),
  ('10000000-0000-0000-0000-000000000027', 'digital_delivery');

update public.offers set status = 'published';
