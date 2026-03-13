import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * Landing page for the Google OAuth redirect.
 *
 * Supabase PKCE flow returns a `?code=` param here. We let the Supabase client
 * exchange that code for a session, then send the user home.  Putting this on
 * its own route avoids race conditions where React Router re-renders the app
 * (e.g. AnimatePresence remounting) before the code exchange completes.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/", { replace: true });
        return;
      }

      // PKCE: exchange the code in the URL for real tokens
      const { searchParams } = new URL(window.location.href);
      const code = searchParams.get("code");
      if (code) {
        supabase.auth
          .exchangeCodeForSession(window.location.href)
          .then(({ error }) => {
            if (error) {
              console.error("OAuth code exchange failed:", error.message);
            }
            navigate("/", { replace: true });
          });
      } else {
        // Nothing to exchange — just go home
        navigate("/", { replace: true });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}
