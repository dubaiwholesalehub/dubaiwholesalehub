-- ============================================================
-- Migration 180
-- Protect UAE Tax Invoice mandatory display settings
--
-- Purpose:
--   Prevent a UAE Tax Invoice from being saved with important
--   tax-invoice presentation fields hidden.
--
-- Important:
--   - Presentation safeguard only.
--   - No accounting postings.
--   - No VAT journal changes.
--   - No inventory changes.
--   - No Sales Order changes.
--   - Simple / Export invoice templates remain configurable.
-- ============================================================


-- ============================================================
-- 1. Validation function
-- ============================================================

create or replace function public.validate_uae_tax_invoice_display_settings()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_buyer_trn text;
begin

    -- --------------------------------------------------------
    -- Only protect the UAE Tax Invoice template.
    -- Simple and Export invoices remain flexible.
    -- --------------------------------------------------------

    if new.template_type is distinct from 'uae_tax' then
        return new;
    end if;


    -- --------------------------------------------------------
    -- Seller / company requirements
    -- --------------------------------------------------------

    if coalesce(
        (new.display_settings ->> 'show_company_address')::boolean,
        false
    ) is not true then
        raise exception
            'UAE Tax Invoice requires Company Address to be displayed.';
    end if;


    if coalesce(
        (new.display_settings ->> 'show_company_trn')::boolean,
        false
    ) is not true then
        raise exception
            'UAE Tax Invoice requires Company TRN to be displayed.';
    end if;


    -- --------------------------------------------------------
    -- Customer requirements
    -- --------------------------------------------------------

    if coalesce(
        (new.display_settings ->> 'show_customer_name')::boolean,
        false
    ) is not true then
        raise exception
            'UAE Tax Invoice requires Customer Name to be displayed.';
    end if;


    if coalesce(
        (new.display_settings ->> 'show_billing_address')::boolean,
        false
    ) is not true then
        raise exception
            'UAE Tax Invoice requires Billing Address to be displayed.';
    end if;


    -- --------------------------------------------------------
    -- VAT presentation
    -- --------------------------------------------------------

    if coalesce(
        (new.display_settings ->> 'show_vat')::boolean,
        false
    ) is not true then
        raise exception
            'UAE Tax Invoice requires VAT information to be displayed.';
    end if;


    -- --------------------------------------------------------
    -- If the historical buyer snapshot contains a TRN,
    -- the Customer TRN cannot be hidden.
    --
    -- buyer_snapshot.customer.tax_registration_number
    -- was introduced by Migration 179.
    -- --------------------------------------------------------

    v_buyer_trn :=
        nullif(
            btrim(
                coalesce(
                    new.buyer_snapshot
                        -> 'customer'
                        ->> 'tax_registration_number',
                    ''
                )
            ),
            ''
        );


    if v_buyer_trn is not null
       and coalesce(
            (new.display_settings ->> 'show_customer_trn')::boolean,
            false
       ) is not true then

        raise exception
            'UAE Tax Invoice requires Customer TRN to be displayed when the customer is VAT registered.';

    end if;


    return new;

end;
$$;


-- ============================================================
-- 2. Protect inserts and updates
-- ============================================================

drop trigger if exists
    trg_validate_uae_tax_invoice_display_settings
on public.sales_invoice_documents;


create trigger trg_validate_uae_tax_invoice_display_settings
before insert or update
on public.sales_invoice_documents
for each row
execute function public.validate_uae_tax_invoice_display_settings();


-- ============================================================
-- 3. Function permissions
-- ============================================================

revoke all
on function public.validate_uae_tax_invoice_display_settings()
from public;

grant execute
on function public.validate_uae_tax_invoice_display_settings()
to authenticated;


-- ============================================================
-- 4. Documentation
-- ============================================================

comment on function public.validate_uae_tax_invoice_display_settings()
is
'Protects mandatory UAE Tax Invoice presentation settings. Prevents hiding seller address/TRN, customer name/address, VAT information, and customer TRN when the historical buyer snapshot contains a TRN. Presentation safeguard only; has no accounting side effects.';