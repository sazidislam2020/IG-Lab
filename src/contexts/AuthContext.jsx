import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// Extra attempts for transient profile-fetch failures (network errors,
// Supabase clock-skew "JWT issued at future" 401s, rate limits, 5xx).
const PROFILE_RETRY_ATTEMPTS = 3;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Monotonic id so a slow fetch for a *previous* user can never overwrite
  // the profile of the user who signed in most recently.
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("getSession error:", err);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Drop any profile left over from a different user before loading the
        // new one, so a failed fetch can't expose the previous account's data.
        setProfile((prev) => (prev && prev.id === session.user.id ? prev : null));
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId, email, attempt = 0) {
    const fetchId = ++fetchSeqRef.current;
    console.log(`Fetching profile for user: ${userId} (attempt ${attempt + 1})`);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // A newer fetch (a different user, or a retry) has started — abandon this
    // result so stale data never lands on the wrong account.
    if (fetchId !== fetchSeqRef.current) return;

    if (error) {
      console.error("Error fetching profile:", error.message, error);

      // Missing row (trigger race or RLS): create ourselves as an unapproved
      // student, then re-read. RLS only allows inserting yourself.
      if (error.code === "PGRST116" || error.message?.includes("0 rows")) {
        console.log("Profile not found, attempting to create...");
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, email, role: "student", status: "pending" });
        if (insertError) {
          console.error("Failed to create profile:", insertError.message);
        } else {
          // Re-fetch after creating
          const { data: newData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          if (fetchId === fetchSeqRef.current && newData) setProfile(newData);
        }
        setLoading(false);
        return;
      }

      // Transient failure (network error, 401 JWT clock-skew, 429, 5xx):
      // back off and retry instead of leaving the app stuck with no profile.
      const transient =
        !error.code ||
        error.status === 401 ||
        error.status === 429 ||
        (error.status >= 500 && error.status <= 599) ||
        /JWT|fetch|network|timeout|Failed to fetch/i.test(error.message || "");
      if (transient && attempt < PROFILE_RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        return fetchProfile(userId, email, attempt + 1);
      }

      // Give up: stop the spinner. `profile` stays null (never the previous
      // user's), so role gates fall back safely instead of leaking access.
      setLoading(false);
      return;
    }

    console.log("Profile loaded:", data);
    if (fetchId === fetchSeqRef.current) setProfile(data);
    setLoading(false);
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Where Supabase sends the person after they click the confirmation
        // link. Without this it falls back to the project Site URL, which is
        // not this app — the link then lands on a dead page. Must also be
        // listed under Authentication → URL Configuration → Redirect URLs.
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;

    // If user was created, update their profile with full_name
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", data.user.id);

      if (profileError) console.error("Profile update error:", profileError);
    }

    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin: profile?.role === "admin" || profile?.role === "super_admin",
    isTeacher: profile?.role === "teacher",
    isStudent: profile?.role === "student",
    isSuperAdmin: profile?.role === "super_admin",
    isApproved: profile?.status === "approved",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
