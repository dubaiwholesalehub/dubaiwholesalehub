/*
 * =========================================================
 * 191 — Sales Order Modification Foundation
 *
 * PURPOSE
 * -------
 *
 * Creates the permanent audit/revision foundation for
 * controlled modification of financially posted Sales Orders.
 *
 * IMPORTANT
 * ---------
 *
 * This migration DOES NOT weaken Sales Order immutability.
 *
 * Confirmed Sales Orders remain protected by migration 158.
 *
 * Later controlled SECURITY DEFINER workflows will:
 *
 *   - validate the requested correction;
 *   - calculate commercial differences;
 *   - create accounting corrections;
 *   - create inventory corrections when required;
 *   - preserve existing receipts/payment history;
 *   - apply the authorized corrected commercial state;
 *   - record all effects against this revision.
 *
 * Genuine physical customer returns continue to use the
 * existing Sales Return / Credit Note workflow.
 * =========================================================
 */


/* =========================================================
 * 1. Sales Order Revisions
 * ========================================================= */

create table if not exists
  public.sales_order_revisions
(
  id uuid
    primary key
    default gen_random_uuid(),

  sales_order_id uuid
    not null
    references public.sales_orders(id)
    on delete restrict,

  revision_number integer
    not null,

  /*
   * entry_correction
   *   Corrects an incorrectly entered invoice/order.
   *
   * commercial_adjustment
   *   Corrects commercial values without representing a
   *   physical customer return.
   *
   * exchange_adjustment
   *   Reserved for controlled exchange coordination where
   *   Sales Return documents may also be linked.
   */
  modification_type text
    not null,

  reason text
    not null,

  notes text,

  /*
   * Workflow:
   *
   * draft
   *   Revision exists but has not been applied.
   *
   * applied
   *   All controlled correction effects completed.
   *
   * failed
   *   Reserved for explicit workflow failure recording.
   *
   * cancelled
   *   Draft revision abandoned before application.
   */
  status text
    not null
    default 'draft',

  /*
   * Complete immutable snapshots.
   *
   * before_snapshot:
   *   Sales Order/header/items before modification.
   *
   * after_snapshot:
   *   Requested/final corrected commercial state.
   */
  before_snapshot jsonb
    not null,

  after_snapshot jsonb
    not null,

  /*
   * Optional structured difference calculated by the
   * controlled modification engine.
   */
  difference_snapshot jsonb,

  /*
   * Commercial totals before / after.
   */
  original_grand_total numeric(18, 2)
    not null,

  revised_grand_total numeric(18, 2)
    not null,

  total_difference numeric(18, 2)
    not null,

  /*
   * Payment state at modification time.
   *
   * Existing receipts remain historical and are not rewritten.
   */
  original_paid_amount numeric(18, 2)
    not null
    default 0,

  revised_balance_due numeric(18, 2)
    not null
    default 0,

  customer_credit_amount numeric(18, 2)
    not null
    default 0,

  additional_amount_due numeric(18, 2)
    not null
    default 0,

  /*
   * Optional links to existing controlled correction documents.
   *
   * A genuine physical return may use Sales Return / Credit Note.
   */
  sales_return_id uuid
    references public.sales_returns(id)
    on delete restrict,

  /*
   * GL references.
   *
   * Later migrations may populate one or both depending on
   * whether the correction is implemented as reversal/repost
   * or differential journals.
   */
  commercial_journal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  inventory_journal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  /*
   * Inventory transaction generated specifically by the
   * modification engine when stock correction is required.
   */
  inventory_transaction_id uuid
    references public.inventory_transactions(id)
    on delete restrict,

  /*
   * Idempotency key protects against accidental double-submit.
   */
  idempotency_key text
    not null,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  applied_by uuid
    references public.profiles(id)
    on delete set null,

  cancelled_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  applied_at timestamptz,

  cancelled_at timestamptz,

  constraint
    sales_order_revisions_revision_positive
  check (
    revision_number > 0
  ),

  constraint
    sales_order_revisions_type_check
  check (
    modification_type in (
      'entry_correction',
      'commercial_adjustment',
      'exchange_adjustment'
    )
  ),

  constraint
    sales_order_revisions_status_check
  check (
    status in (
      'draft',
      'applied',
      'failed',
      'cancelled'
    )
  ),

  constraint
    sales_order_revisions_reason_not_empty
  check (
    length(
      trim(reason)
    ) >= 3
  ),

  constraint
    sales_order_revisions_original_total_nonnegative
  check (
    original_grand_total >= 0
  ),

  constraint
    sales_order_revisions_revised_total_nonnegative
  check (
    revised_grand_total >= 0
  ),

  constraint
    sales_order_revisions_paid_nonnegative
  check (
    original_paid_amount >= 0
  ),

  constraint
    sales_order_revisions_balance_nonnegative
  check (
    revised_balance_due >= 0
  ),

  constraint
    sales_order_revisions_credit_nonnegative
  check (
    customer_credit_amount >= 0
  ),

  constraint
    sales_order_revisions_additional_due_nonnegative
  check (
    additional_amount_due >= 0
  ),

  constraint
    sales_order_revisions_order_revision_unique
  unique (
    sales_order_id,
    revision_number
  ),

  constraint
    sales_order_revisions_idempotency_unique
  unique (
    idempotency_key
  )
);


/* =========================================================
 * 2. Indexes
 * ========================================================= */

create index if not exists
  sales_order_revisions_order_idx
on
  public.sales_order_revisions (
    sales_order_id,
    revision_number desc
  );


create index if not exists
  sales_order_revisions_status_idx
on
  public.sales_order_revisions (
    status
  );


create index if not exists
  sales_order_revisions_created_at_idx
on
  public.sales_order_revisions (
    created_at desc
  );


create index if not exists
  sales_order_revisions_sales_return_idx
on
  public.sales_order_revisions (
    sales_return_id
  )
where
  sales_return_id is not null;


/* =========================================================
 * 3. Protect Applied / Cancelled Revisions
 *
 * Same architectural principle used by Sales Returns:
 *
 * ordinary application writes cannot mutate historical
 * revisions.
 *
 * Later controlled SECURITY DEFINER workflows may use:
 *
 *   app.sales_order_revision_internal_write = on
 *
 * transaction-locally.
 * ========================================================= */

create or replace function
  public.protect_final_sales_order_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    current_setting(
      'app.sales_order_revision_internal_write',
      true
    ) =
      'on'
  then
    return new;
  end if;


  if
    old.status in (
      'applied',
      'cancelled'
    )
  then
    raise exception
      'Applied or cancelled Sales Order revisions cannot be edited directly.';
  end if;


  return new;

end;
$$;


drop trigger if exists
  protect_final_sales_order_revision
on
  public.sales_order_revisions;


create trigger
  protect_final_sales_order_revision

before update
on
  public.sales_order_revisions

for each row

execute function
  public.protect_final_sales_order_revision();


/* =========================================================
 * 4. Prevent Deletion Of Revision History
 * ========================================================= */

create or replace function
  public.prevent_sales_order_revision_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  raise exception
    'Sales Order revision history cannot be deleted.';

end;
$$;


drop trigger if exists
  prevent_sales_order_revision_delete
on
  public.sales_order_revisions;


create trigger
  prevent_sales_order_revision_delete

before delete
on
  public.sales_order_revisions

for each row

execute function
  public.prevent_sales_order_revision_delete();


/* =========================================================
 * 5. RLS
 * ========================================================= */

alter table
  public.sales_order_revisions
enable row level security;


drop policy if exists
  sales_order_revisions_admin_select
on
  public.sales_order_revisions;


create policy
  sales_order_revisions_admin_select

on
  public.sales_order_revisions

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  sales_order_revisions_admin_manage
on
  public.sales_order_revisions;


create policy
  sales_order_revisions_admin_manage

on
  public.sales_order_revisions

for all

to authenticated

using (
  public.is_admin()
)

with check (
  public.is_admin()
);


/* =========================================================
 * 6. Grants
 * ========================================================= */

grant select,
      insert,
      update
on
  public.sales_order_revisions
to authenticated;


/* =========================================================
 * 7. Documentation
 * ========================================================= */

comment on table
  public.sales_order_revisions
is
  'Immutable audit/revision ledger for controlled modification of financially posted Sales Orders. Does not replace Sales Returns/Credit Notes for genuine physical customer returns.';


comment on column
  public.sales_order_revisions.before_snapshot
is
  'Immutable snapshot of the Sales Order commercial state immediately before the controlled modification.';


comment on column
  public.sales_order_revisions.after_snapshot
is
  'Snapshot of the corrected Sales Order commercial state requested/applied by the controlled modification workflow.';


comment on column
  public.sales_order_revisions.difference_snapshot
is
  'Structured commercial, inventory and accounting differences calculated by the modification engine.';


comment on column
  public.sales_order_revisions.sales_return_id
is
  'Optional linkage to an existing Sales Return/Credit Note when the modification includes a genuine physical customer return.';


comment on column
  public.sales_order_revisions.idempotency_key
is
  'Unique application-generated key preventing accidental duplicate execution of the same Sales Order modification request.';


comment on function
  public.protect_final_sales_order_revision()
is
  'Prevents ordinary mutation of applied/cancelled Sales Order revisions while permitting narrowly controlled transaction-local internal workflow updates.';


comment on function
  public.prevent_sales_order_revision_delete()
is
  'Prevents deletion of Sales Order revision history.';