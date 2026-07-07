-- Add body scan photo storage columns to profiles
alter table profiles
add column if not exists body_scan_photos text[] default '{}',
add column if not exists body_scan_updated_at timestamptz;
