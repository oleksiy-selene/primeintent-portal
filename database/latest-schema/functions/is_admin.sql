-- function: is_admin
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE user_id = auth.uid() AND role = 'admin'
  );
$function$;
