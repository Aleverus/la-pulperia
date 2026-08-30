begin;
select plan(24);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'seller_presences', 'seller_presences exists');
select has_table('public', 'offers', 'offers exists');
select has_table('public', 'offer_media', 'offer_media exists');
select has_table('public', 'request_batches', 'request_batches exists');
select has_table('public', 'seller_requests', 'seller_requests exists');
select has_table('public', 'request_items', 'request_items exists');
select has_table('public', 'reports', 'reports exists');
select has_table('public', 'public_context_notes', 'public_context_notes exists');
select has_table('public', 'search_events', 'search_events exists');
select has_table('public', 'operator_actions', 'operator_actions exists');
select has_table('public', 'operator_members', 'operator_members exists');
select has_table('public', 'offer_fulfillment_modes', 'offer fulfillment exists');

select has_type('public', 'offer_class', 'offer_class exists');
select has_type('public', 'price_mode', 'price_mode exists');
select has_type('public', 'availability_model', 'availability_model exists');
select has_type('public', 'availability_state', 'availability_state exists');
select has_type('public', 'presence_mode', 'presence_mode exists');
select has_type('public', 'fulfillment_mode', 'fulfillment_mode exists');

select has_extension('postgis');
select has_extension('pg_trgm');
select has_extension('unaccent');
select has_extension('citext');
select has_extension('pgcrypto');

select * from finish();
rollback;
