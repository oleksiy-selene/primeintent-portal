-- function: handle_user_signin
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE OR REPLACE FUNCTION public.handle_user_signin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
       SET last_sign_in_at = NEW.last_sign_in_at,
           email = NEW.email
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
