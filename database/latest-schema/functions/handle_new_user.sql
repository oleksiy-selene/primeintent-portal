-- function: handle_new_user
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always default to 'viewer'. The actual role is set explicitly by the
  -- admin-invite endpoint via a service-role upsert *after* the invite.
  -- We never read role from raw_user_meta_data here, because that value can
  -- be supplied by anyone calling supabase.auth.signUp from the client and
  -- would otherwise be a privilege-escalation vector.
  INSERT INTO public.profiles (user_id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    'viewer',
    NEW.raw_user_meta_data->>'display_name'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$function$;
