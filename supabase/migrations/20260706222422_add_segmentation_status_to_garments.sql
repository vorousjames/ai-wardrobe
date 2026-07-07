-- Add segmentation_status column to garments table
alter table garments 
add column if not exists segmentation_status text 
default 'not_started' 
check (segmentation_status in ('not_started', 'processing', 'complete', 'failed'));