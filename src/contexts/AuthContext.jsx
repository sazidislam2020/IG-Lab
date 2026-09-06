import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
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
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    console.log("Fetching profile for user:", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error.message, error);
      // If profile doesn't exist, try to create it
      if (error.code === "PGRST116" || error.message?.includes("0 rows")) {
        console.log("Profile not found, attempting to create...");
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, email: user?.email, role: "student", status: "pending" });
        if (insertError) {
          console.error("Failed to create profile:", insertError.message);
        } else {
          // Re-fetch after creating
          const { data: newData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          setProfile(newData);
        }
      }
    } else {
      console.log("Profile loaded:", data);
      setProfile(data);
    }
    setLoading(false);
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
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
