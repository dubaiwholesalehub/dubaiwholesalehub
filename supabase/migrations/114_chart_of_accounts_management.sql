/*
 * =========================================================
 * 114 — Safe Chart of Accounts Management
 *
 * PURPOSE
 * -------
 *
 * Adds controlled administration of custom GL accounts.
 *
 * IMPORTANT SAFETY RULES
 * ----------------------
 *
 * 1. System GL accounts cannot be modified.
 * 2. Control accounts cannot be modified.
 * 3. Account codes cannot be changed after creation.
 * 4. Account class / statement / normal balance are inherited
 *    from the selected parent heading.
 * 5. Custom accounts must be created below an active,
 *    non-posting heading account.
 * 6. GL accounts are never deleted through the application.
 * 7. Deactivation is blocked when an account is:
 *
 *      - used by an active system mapping
 *      - mapped to a Financial Account
 *      - mapped to an Expense Category
 *      - the parent of an active child account
 *
 * Existing posted journal history does NOT prevent
 * deactivation because historical GL reporting must continue
 * to display inactive accounts.
 *
 *
 * SECURITY
 * --------
 *
 * Authenticated application users receive SELECT access only
 * to public.gl_accounts.
 *
 * All application writes must pass through SECURITY DEFINER
 * RPCs defined below.
 * =========================================================
 */


/* =========================================================
 * 1. Remove direct application mutation access
 * ========================================================= */

revoke insert, update, delete
on public.gl_accounts
from authenticated;


/*
 * The original broad admin RLS write policy was useful while
 * the GL foundation was being built.
 *
 * Chart of Accounts mutations are now intentionally routed
 * through the controlled RPCs below.
 */

drop policy if exists
  gl_accounts_admin_manage
on
  public.gl_accounts;


/* =========================================================
 * 2. Create Custom GL Account
 * ========================================================= */

create or replace function
  public.create_custom_gl_account(
    p_parent_id uuid,
    p_account_code text,
    p_account_name text,
    p_description text
      default null,
    p_allow_manual_posting boolean
      default true,
    p_display_order integer
      default 0
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_parent
    public.gl_accounts%rowtype;

  v_account_id uuid;

  v_account_code text;

  v_account_name text;

begin

  /* -------------------------------------------------------
   * Security
   * ------------------------------------------------------- */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* -------------------------------------------------------
   * Required values
   * ------------------------------------------------------- */

  if
    p_parent_id is null
  then
    raise exception
      'A parent GL heading account is required.';
  end if;


  v_account_code :=
    trim(
      coalesce(
        p_account_code,
        ''
      )
    );


  if
    length(
      v_account_code
    ) =
      0
  then
    raise exception
      'GL account code is required.';
  end if;


  v_account_name :=
    trim(
      coalesce(
        p_account_name,
        ''
      )
    );


  if
    length(
      v_account_name
    ) =
      0
  then
    raise exception
      'GL account name is required.';
  end if;


  if
    p_display_order <
      0
  then
    raise exception
      'Display order cannot be negative.';
  end if;


  /* -------------------------------------------------------
   * Account code must be unique.
   * ------------------------------------------------------- */

  if exists (
    select
      1

    from
      public.gl_accounts

    where
      lower(
        account_code
      ) =
        lower(
          v_account_code
        )
  )
  then
    raise exception
      'GL account code "%" already exists.',
      v_account_code;
  end if;


  /* -------------------------------------------------------
   * Resolve / lock parent.
   * ------------------------------------------------------- */

  select
    *
  into
    v_parent

  from
    public.gl_accounts

  where
    id =
      p_parent_id

  for update;


  if not found
  then
    raise exception
      'Parent GL account % does not exist.',
      p_parent_id;
  end if;


  if
    not v_parent.is_active
  then
    raise exception
      'Parent GL account % - % is inactive.',
      v_parent.account_code,
      v_parent.account_name;
  end if;


  /*
   * Custom accounts are deliberately created only below
   * heading/grouping accounts.
   */

  if
    v_parent.is_posting_account
  then
    raise exception
      'Parent GL account % - % is a posting account. Custom accounts must be created below a heading account.',
      v_parent.account_code,
      v_parent.account_name;
  end if;


  /*
   * The child inherits accounting identity from its parent.
   *
   * This prevents an Asset account from accidentally being
   * inserted below Expenses, or a credit-normal account under
   * an incompatible hierarchy.
   */

  insert into
    public.gl_accounts
  (
    account_code,
    account_name,
    parent_id,
    account_class,
    statement_type,
    normal_balance,
    description,
    is_posting_account,
    is_control_account,
    allow_manual_posting,
    is_system_account,
    is_active,
    display_order,
    created_by,
    updated_by
  )
  values
  (
    v_account_code,
    v_account_name,
    v_parent.id,
    v_parent.account_class,
    v_parent.statement_type,
    v_parent.normal_balance,
    nullif(
      trim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),
    true,
    false,
    coalesce(
      p_allow_manual_posting,
      true
    ),
    false,
    true,
    p_display_order,
    auth.uid(),
    auth.uid()
  )

  returning
    id
  into
    v_account_id;


  return
    v_account_id;

end;
$$;


/* =========================================================
 * 3. Update Custom GL Account
 *
 * Structural accounting identity is deliberately immutable.
 *
 * Editable:
 *
 *   account_name
 *   description
 *   allow_manual_posting
 *   display_order
 *
 *
 * Not editable:
 *
 *   account_code
 *   parent_id
 *   account_class
 *   statement_type
 *   normal_balance
 *   is_posting_account
 *   is_control_account
 *   is_system_account
 * ========================================================= */

create or replace function
  public.update_custom_gl_account(
    p_gl_account_id uuid,
    p_account_name text,
    p_description text,
    p_allow_manual_posting boolean,
    p_display_order integer
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_account
    public.gl_accounts%rowtype;

  v_account_name text;

begin

  /* -------------------------------------------------------
   * Security
   * ------------------------------------------------------- */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  if
    p_gl_account_id is null
  then
    raise exception
      'GL Account ID is required.';
  end if;


  /* -------------------------------------------------------
   * Resolve / lock account.
   * ------------------------------------------------------- */

  select
    *
  into
    v_account

  from
    public.gl_accounts

  where
    id =
      p_gl_account_id

  for update;


  if not found
  then
    raise exception
      'GL account % does not exist.',
      p_gl_account_id;
  end if;


  /* -------------------------------------------------------
   * Protected accounting accounts.
   * ------------------------------------------------------- */

  if
    v_account.is_system_account
  then
    raise exception
      'System GL account % - % is protected and cannot be edited.',
      v_account.account_code,
      v_account.account_name;
  end if;


  if
    v_account.is_control_account
  then
    raise exception
      'Control GL account % - % is protected and cannot be edited.',
      v_account.account_code,
      v_account.account_name;
  end if;


  /*
   * This management workflow currently supports custom
   * posting accounts only.
   */

  if
    not v_account.is_posting_account
  then
    raise exception
      'Custom heading accounts cannot currently be edited through this workflow.';
  end if;


  /* -------------------------------------------------------
   * Validate editable fields.
   * ------------------------------------------------------- */

  v_account_name :=
    trim(
      coalesce(
        p_account_name,
        ''
      )
    );


  if
    length(
      v_account_name
    ) =
      0
  then
    raise exception
      'GL account name is required.';
  end if;


  if
    p_display_order <
      0
  then
    raise exception
      'Display order cannot be negative.';
  end if;


  update
    public.gl_accounts

  set
    account_name =
      v_account_name,

    description =
      nullif(
        trim(
          coalesce(
            p_description,
            ''
          )
        ),
        ''
      ),

    allow_manual_posting =
      coalesce(
        p_allow_manual_posting,
        false
      ),

    display_order =
      p_display_order,

    updated_by =
      auth.uid(),

    updated_at =
      now()

  where
    id =
      p_gl_account_id;


  return
    p_gl_account_id;

end;
$$;


/* =========================================================
 * 4. Activate / Deactivate Custom GL Account
 * ========================================================= */

create or replace function
  public.set_custom_gl_account_active(
    p_gl_account_id uuid,
    p_is_active boolean
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_account
    public.gl_accounts%rowtype;

begin

  /* -------------------------------------------------------
   * Security
   * ------------------------------------------------------- */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  if
    p_gl_account_id is null
  then
    raise exception
      'GL Account ID is required.';
  end if;


  if
    p_is_active is null
  then
    raise exception
      'Active status is required.';
  end if;


  /* -------------------------------------------------------
   * Resolve / lock account.
   * ------------------------------------------------------- */

  select
    *
  into
    v_account

  from
    public.gl_accounts

  where
    id =
      p_gl_account_id

  for update;


  if not found
  then
    raise exception
      'GL account % does not exist.',
      p_gl_account_id;
  end if;


  /* -------------------------------------------------------
   * System/control accounts stay protected.
   * ------------------------------------------------------- */

  if
    v_account.is_system_account
  then
    raise exception
      'System GL account % - % cannot be activated or deactivated manually.',
      v_account.account_code,
      v_account.account_name;
  end if;


  if
    v_account.is_control_account
  then
    raise exception
      'Control GL account % - % cannot be activated or deactivated manually.',
      v_account.account_code,
      v_account.account_name;
  end if;


  /*
   * Nothing to do.
   */

  if
    v_account.is_active =
      p_is_active
  then
    return
      p_gl_account_id;
  end if;


  /* -------------------------------------------------------
   * Deactivation safety checks.
   * ------------------------------------------------------- */

  if
    not p_is_active
  then

    /*
     * Active semantic posting mappings.
     */

    if exists (
      select
        1

      from
        public.gl_account_mappings mapping

      where
        mapping.gl_account_id =
          p_gl_account_id

        and
        mapping.is_active =
          true
    )
    then
      raise exception
        'GL account % - % is used by an active system account mapping and cannot be deactivated.',
        v_account.account_code,
        v_account.account_name;
    end if;


    /*
     * Treasury mapping.
     */

    if exists (
      select
        1

      from
        public.financial_accounts financial_account

      where
        financial_account.gl_account_id =
          p_gl_account_id

        and
        financial_account.is_active =
          true
    )
    then
      raise exception
        'GL account % - % is used by an active Financial Account and cannot be deactivated.',
        v_account.account_code,
        v_account.account_name;
    end if;


    /*
     * Expense category mapping.
     */

    if exists (
      select
        1

      from
        public.expense_categories expense_category

      where
        expense_category.gl_account_id =
          p_gl_account_id

        and
        expense_category.is_active =
          true
    )
    then
      raise exception
        'GL account % - % is used by an active Expense Category and cannot be deactivated.',
        v_account.account_code,
        v_account.account_name;
    end if;


    /*
     * Parent account protection.
     *
     * This normally applies only if custom heading accounts
     * are introduced later.
     */

    if exists (
      select
        1

      from
        public.gl_accounts child

      where
        child.parent_id =
          p_gl_account_id

        and
        child.is_active =
          true
    )
    then
      raise exception
        'GL account % - % has active child accounts and cannot be deactivated.',
        v_account.account_code,
        v_account.account_name;
    end if;

  end if;


  update
    public.gl_accounts

  set
    is_active =
      p_is_active,

    updated_by =
      auth.uid(),

    updated_at =
      now()

  where
    id =
      p_gl_account_id;


  return
    p_gl_account_id;

end;
$$;


/* =========================================================
 * 5. Permissions
 * ========================================================= */

revoke all
on function
  public.create_custom_gl_account(
    uuid,
    text,
    text,
    text,
    boolean,
    integer
  )
from public;


revoke all
on function
  public.update_custom_gl_account(
    uuid,
    text,
    text,
    boolean,
    integer
  )
from public;


revoke all
on function
  public.set_custom_gl_account_active(
    uuid,
    boolean
  )
from public;


grant execute
on function
  public.create_custom_gl_account(
    uuid,
    text,
    text,
    text,
    boolean,
    integer
  )
to authenticated;


grant execute
on function
  public.update_custom_gl_account(
    uuid,
    text,
    text,
    boolean,
    integer
  )
to authenticated;


grant execute
on function
  public.set_custom_gl_account_active(
    uuid,
    boolean
  )
to authenticated;


/* =========================================================
 * 6. Documentation
 * ========================================================= */

comment on function
  public.create_custom_gl_account(
    uuid,
    text,
    text,
    text,
    boolean,
    integer
  )
is
  'Safely creates an administrator-managed custom posting GL account beneath an active non-posting heading. Accounting class, statement type and normal balance are inherited from the parent.';


comment on function
  public.update_custom_gl_account(
    uuid,
    text,
    text,
    boolean,
    integer
  )
is
  'Updates safe descriptive properties of a custom posting GL account. System/control accounts and structural accounting identity are protected.';


comment on function
  public.set_custom_gl_account_active(
    uuid,
    boolean
  )
is
  'Activates or deactivates a custom GL account while protecting system/control accounts and accounts referenced by active system, treasury, expense-category or child-account mappings.';