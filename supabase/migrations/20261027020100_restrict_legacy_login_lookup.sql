-- The application now uses find_login_email, which returns only the email needed before authentication.
-- Keep the legacy full-profile lookup inaccessible to client roles.
REVOKE EXECUTE ON FUNCTION public.find_profile_for_login(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_profile_for_login(text) TO service_role;

-- The minimal lookup is required before sign-in; authenticated sessions do not need it.
REVOKE EXECUTE ON FUNCTION public.find_login_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_login_email(text) TO anon, service_role;
