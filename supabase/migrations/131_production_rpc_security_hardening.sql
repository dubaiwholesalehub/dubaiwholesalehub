/* =========================================================
 * 131 — Production RPC Security Hardening
 *
 * PURPOSE
 * -------
 * Remove unintended anonymous/public EXECUTE access from
 * SECURITY DEFINER functions in the public schema.
 *
 * IMPORTANT
 * ---------
 * This migration intentionally does NOT change authenticated
 * EXECUTE privileges.
 *
 * Application-level authenticated access will be reviewed
 * separately so existing ERP workflows are not broken.
 * ========================================================= */


/* =========================================================
 * 1. Remove anonymous EXECUTE from every SECURITY DEFINER
 *    function in the public schema.
 * ========================================================= */

do $$
declare
    v_function record;
begin
    for v_function in
        select
            p.oid,
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid)
                as identity_arguments
        from
            pg_proc p
        join
            pg_namespace n
                on n.oid = p.pronamespace
        where
            n.nspname = 'public'
            and p.prosecdef = true
    loop
        execute format(
            'revoke execute on function %I.%I(%s) from anon',
            v_function.schema_name,
            v_function.function_name,
            v_function.identity_arguments
        );
    end loop;
end;
$$;


/* =========================================================
 * 2. Remove EXECUTE inherited through PostgreSQL PUBLIC
 *
 * PUBLIC is PostgreSQL's implicit role containing every role.
 *
 * No SECURITY DEFINER function in this ERP should depend on
 * implicit PUBLIC execution.
 * ========================================================= */

do $$
declare
    v_function record;
begin
    for v_function in
        select
            p.oid,
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid)
                as identity_arguments
        from
            pg_proc p
        join
            pg_namespace n
                on n.oid = p.pronamespace
        where
            n.nspname = 'public'
            and p.prosecdef = true
    loop
        execute format(
            'revoke execute on function %I.%I(%s) from public',
            v_function.schema_name,
            v_function.function_name,
            v_function.identity_arguments
        );
    end loop;
end;
$$;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on schema public is
'Application schema. SECURITY DEFINER functions must not expose implicit PUBLIC or anonymous EXECUTE privileges.';