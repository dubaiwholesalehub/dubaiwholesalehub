-- ==========================================
-- SANWAN ALSHAMS TRADING LLC
-- DubaiWholesaleHub Database Foundation
-- ==========================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ==========================================
-- Auto Updated Timestamp Function
-- ==========================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;