-- Expose only the email needed for login/recovery; do not return profile data to anonymous callers.
CREATE OR REPLACE FUNCTION public.find_login_email(p_identifier text)
RETURNS TABLE(email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.email
  FROM public.profiles AS p
  WHERE lower(coalesce(p.email, '')) = lower(trim(p_identifier))
     OR lower(coalesce(p.username, '')) = lower(trim(p_identifier))
     OR (
       regexp_replace(trim(p_identifier), '[^0-9]', '', 'g') <> ''
       AND regexp_replace(coalesce(p.re, ''), '[^0-9]', '', 'g')
           = regexp_replace(trim(p_identifier), '[^0-9]', '', 'g')
     )
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_login_email(text) TO anon, authenticated, service_role;
