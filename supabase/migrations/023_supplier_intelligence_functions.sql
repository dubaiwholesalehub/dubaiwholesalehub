-- =====================================================
-- Supplier Intelligence business rules
-- =====================================================

-- Prevent the same supplier from being attached to the
-- same product more than once, including archived records.
create unique index if not exists
idx_product_suppliers_unique_product_supplier
on public.product_suppliers(product_id, supplier_id);


-- =====================================================
-- Set one preferred supplier atomically
-- =====================================================

create or replace function public.set_product_preferred_supplier(
  p_product_id uuid,
  p_mapping_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.product_suppliers
    where id = p_mapping_id
      and product_id = p_product_id
      and is_active = true
  ) then
    raise exception
      'The selected active product supplier could not be found.';
  end if;

  update public.product_suppliers
  set
    is_preferred = false,
    updated_at = now()
  where product_id = p_product_id
    and is_preferred = true;

  update public.product_suppliers
  set
    is_preferred = true,
    is_active = true,
    updated_at = now()
  where id = p_mapping_id
    and product_id = p_product_id;
end;
$$;


-- =====================================================
-- Archive a mapping safely
-- =====================================================

create or replace function public.archive_product_supplier(
  p_product_id uuid,
  p_mapping_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.product_suppliers
  set
    is_active = false,
    is_preferred = false,
    updated_at = now()
  where id = p_mapping_id
    and product_id = p_product_id;

  if not found then
    raise exception 'Product supplier mapping not found.';
  end if;
end;
$$;


-- =====================================================
-- Restore an archived mapping
-- =====================================================

create or replace function public.restore_product_supplier(
  p_product_id uuid,
  p_mapping_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.product_suppliers
  set
    is_active = true,
    updated_at = now()
  where id = p_mapping_id
    and product_id = p_product_id;

  if not found then
    raise exception 'Product supplier mapping not found.';
  end if;
end;
$$;


-- =====================================================
-- Permissions
-- RLS still controls which rows authenticated users
-- may access or modify.
-- =====================================================

revoke all on function public.set_product_preferred_supplier(uuid, uuid)
from public;

revoke all on function public.archive_product_supplier(uuid, uuid)
from public;

revoke all on function public.restore_product_supplier(uuid, uuid)
from public;


grant execute on function public.set_product_preferred_supplier(uuid, uuid)
to authenticated;

grant execute on function public.archive_product_supplier(uuid, uuid)
to authenticated;

grant execute on function public.restore_product_supplier(uuid, uuid)
to authenticated;