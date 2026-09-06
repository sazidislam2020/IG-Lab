import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * useSubscription — checks the user's active subscription
 *
 * Returns:
 *  - loading: boolean
 *  - subscription: current active subscription row (or null)
 *  - isFree: true if user is on free Explorer plan
 *  - isPaid: true if user has an active paid plan (Builder, Engineer, etc.)
 *  - hasAccess: true if user can access content beyond level 0
 *  - refresh(): re-fetch subscription data
 */
export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchSubscription();
  }, [userId]);

  async function fetchSubscription() {
    setLoading(true);

    // Get the most recent active subscription (or lifetime free)
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if expired
    if (data && data.expires_at) {
      const now = new Date();
      const expires = new Date(data.expires_at);
      if (expires < now) {
        // Mark as expired
        await supabase
          .from("user_subscriptions")
          .update({ status: "expired" })
          .eq("id", data.id);
        setSubscription(null);
      } else {
        setSubscription(data);
      }
    } else {
      setSubscription(data);
    }

    setLoading(false);
  }

  const isFree = !subscription || subscription.plan_name === "Explorer";
  const isPaid = subscription && subscription.plan_name !== "Explorer";
  const hasAccess = isPaid;

  return {
    loading,
    subscription,
    isFree,
    isPaid,
    hasAccess,
    refresh: fetchSubscription,
  };
}

/**
 * isModuleGated — returns true if a module requires a paid subscription
 * Uses the is_free column: super admin can toggle any module as free or paid.
 * This allows marketing campaigns (e.g., unlock all modules for free temporarily).
 */
export function isModuleGated(module) {
  return module.is_free === false;
}
