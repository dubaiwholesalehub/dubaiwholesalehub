/*
 * =========================================================
 * 133 - General Ledger Primitive Isolation
 *
 * PURPOSE
 * -------
 * Prevent authenticated application clients from directly
 * invoking low-level General Ledger posting primitives.
 *
 * Higher-level SECURITY DEFINER ERP workflows continue to
 * call these functions internally under their function-owner
 * execution context.
 *
 * Application-facing controlled workflows such as:
 *
 *   create_manual_gl_journal(...)
 *   post_customer_receipt...
 *   post_supplier_payment...
 *   post_expense...
 *   post_sales_return...
 *   post_supplier_return...
 *
 * remain unchanged.
 * =========================================================
 */


/* =========================================================
 * 1. Draft Journal Header Primitive
 * ========================================================= */

revoke execute
on function public.create_gl_draft_journal(
    date,
    date,
    text,
    uuid,
    text,
    text,
    text,
    numeric
)
from authenticated, anon, public;


/* =========================================================
 * 2. Draft Journal Line Primitive
 * ========================================================= */

revoke execute
on function public.add_gl_draft_journal_line(
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    numeric,
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    integer,
    boolean
)
from authenticated, anon, public;


/* =========================================================
 * 3. Posting Account Validation Primitive
 * ========================================================= */

revoke execute
on function public.validate_gl_posting_account(
    uuid,
    boolean
)
from authenticated, anon, public;


/* =========================================================
 * 4. Journal Posting Primitive
 * ========================================================= */

revoke execute
on function public.post_gl_journal(
    uuid
)
from authenticated, anon, public;


/* =========================================================
 * 5. ERP Journal Construction / Posting Primitive
 *
 * ERP modules call this from controlled SECURITY DEFINER
 * workflows. It is not an application-facing RPC.
 * ========================================================= */

revoke execute
on function public.post_erp_gl_journal(
    text,
    uuid,
    text,
    date,
    date,
    text,
    text,
    numeric,
    jsonb
)
from authenticated, anon, public;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function public.create_gl_draft_journal(
    date,
    date,
    text,
    uuid,
    text,
    text,
    text,
    numeric
)
is
'Internal General Ledger primitive for constructing draft journal headers. Direct application execution is disabled.';


comment on function public.add_gl_draft_journal_line(
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    numeric,
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    integer,
    boolean
)
is
'Internal General Ledger primitive for constructing journal lines. Direct application execution is disabled.';


comment on function public.validate_gl_posting_account(
    uuid,
    boolean
)
is
'Internal General Ledger account-validation primitive. Direct application execution is disabled.';


comment on function public.post_gl_journal(
    uuid
)
is
'Internal General Ledger posting primitive. Direct application execution is disabled.';


comment on function public.post_erp_gl_journal(
    text,
    uuid,
    text,
    date,
    date,
    text,
    text,
    numeric,
    jsonb
)
is
'Internal ERP-to-General-Ledger posting primitive. Must be invoked only through controlled database workflows.';