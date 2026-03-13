import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * OAuth redirect landing page (PKCE flow).
 *
 * The Supabase client already has `detectSessionInUrl: true`, which means it
 * automatically exchanges the `?code=` param the moment the client initialises
 * on this page.  We must NOT call `exchangeCodeForSession` manually — the code
 * is one-time-use, and a second exchange fails and clears the session, causing
 * the "logs in for a second then signs out" symptom.
 *
 * All we do here is wait for the automatic exchange to complete, then navigate.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Fast path: if the exchange already finished by the time React mounts.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/", { replace: true });
      }
    });

    // Slow path: wait for detectSessionInUrl to finish the exchange.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        subscription.unsubscribe();
        navigate("/", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}
