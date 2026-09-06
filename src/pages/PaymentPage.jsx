import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscription } from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";

export default function PaymentPage() {
  const { user, profile } = useAuth();
  const { isDark, colors: t } = useTheme();
  const navigate = useNavigate();
  const { subscription, isFree, isPaid, refresh } = useSubscription(user?.id);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step, setStep] = useState("select"); // select → confirm → processing → done
  const [paymentMethod, setPaymentMethod] = useState("demo");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    const { data } = await supabase
      .from("site_pricing_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setPlans(data || []);
    setLoading(false);
  }

  function handleSelectPlan(plan) {
    if (plan.name === "Explorer") return; // free plan, no payment needed
    setSelectedPlan(plan);
    setStep("confirm");
    setError("");
  }

  async function handlePayment() {
    if (!selectedPlan || !user) return;

    // Validate phone for bkash/nagad
    if ((paymentMethod === "bkash" || paymentMethod === "nagad") && !phoneNumber.trim()) {
      setError("Please enter your mobile number");
      return;
    }

    setProcessing(true);
    setError("");

    // Simulate processing delay (demo payment)
    await new Promise((r) => setTimeout(r, 2000));

    // Create payment record
    const amount = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, "")) || 500;
    const txnId = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        plan_name: selectedPlan.name,
        amount,
        currency: "BDT",
        payment_method: paymentMethod,
        transaction_id: txnId,
        status: "completed",
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (payErr) {
      setError("Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    // Create subscription (30 days for monthly plans)
    const isMonthly = selectedPlan.period?.includes("month");
    const expiresAt = isMonthly
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Deactivate old subscriptions
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "active");

    // Create new subscription
    const { error: subErr } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_name: selectedPlan.name,
        status: "active",
        expires_at: expiresAt,
      });

    if (subErr) {
      setError("Payment recorded but subscription activation failed. Contact support.");
      setProcessing(false);
      return;
    }

    setStep("done");
    setProcessing(false);
    refresh();
  }

  const accentColor = "#FF6B2B";

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter', system-ui, sans-serif", transition: "background 0.3s, color 0.3s" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: `1px solid ${t.border}`, background: isDark ? "rgba(9,9,11,0.92)" : "rgba(250,250,250,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <span style={{ width: 9, height: 9, background: accentColor, borderRadius: 2, transform: "rotate(45deg)", boxShadow: `0 0 10px ${accentColor}` }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: t.txt }}>IGNITE LAB</span>
        </Link>
        <Link to="/dashboard" style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txt, padding: "6px 14px", borderRadius: 6, fontSize: 13, textDecoration: "none", cursor: "pointer" }}>← Back to Dashboard</Link>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px" }}>
        {/* Current subscription status */}
        {subscription && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 13, color: t.txtDim }}>Current Plan:</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: isPaid ? "#4ADE80" : t.txtSec, marginLeft: 8 }}>{subscription.plan_name}</span>
              {subscription.expires_at && (
                <span style={{ fontSize: 12, color: t.txtDim, marginLeft: 12 }}>
                  Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {isPaid && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4ADE80", background: "rgba(74,222,128,0.12)", padding: "4px 12px", borderRadius: 100 }}>✅ Active</span>
            )}
          </div>
        )}

        {/* Step: Select Plan */}
        {step === "select" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 700, marginBottom: 8 }}>
                {isPaid ? "Upgrade Your Plan" : "Unlock Full Access"}
              </h1>
              <p style={{ color: t.txtSec, fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
                Level 0 of every course is free. Upgrade to access all levels, unlimited sandbox, and certificates.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: t.txtDim }}>Loading plans...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {plans.map((plan) => {
                  const isCurrent = subscription?.plan_name === plan.name;
                  const isFreePlan = plan.name === "Explorer";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isCurrent && handleSelectPlan(plan)}
                      style={{
                        background: t.card,
                        border: `2px solid ${plan.is_popular ? accentColor + "60" : t.border}`,
                        borderRadius: 14,
                        padding: "28px 24px",
                        cursor: isCurrent ? "default" : "pointer",
                        transition: "all 0.2s",
                        position: "relative",
                        opacity: isCurrent ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => { if (!isCurrent) { e.currentTarget.style.borderColor = plan.accent_color || accentColor; e.currentTarget.style.transform = "translateY(-2px)"; }}}
                      onMouseLeave={(e) => { if (!isCurrent) { e.currentTarget.style.borderColor = plan.is_popular ? accentColor + "60" : t.border; e.currentTarget.style.transform = "none"; }}}
                    >
                      {plan.is_popular && (
                        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: accentColor, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 100, letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Most Popular
                        </div>
                      )}
                      {isCurrent && (
                        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#4ADE80", color: "#000", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 100 }}>
                          Current Plan
                        </div>
                      )}

                      <div style={{ width: 40, height: 40, borderRadius: 10, background: (plan.accent_color || "#666") + "18", color: plan.accent_color || "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>
                        {isFreePlan ? "🆓" : plan.name === "Builder" ? "🔨" : plan.name === "Engineer" ? "⚙️" : "🏢"}
                      </div>

                      <h3 style={{ fontSize: 18, fontWeight: 700, color: t.txt, marginBottom: 4 }}>{plan.name}</h3>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: plan.accent_color || t.txt }}>{plan.price}</span>
                        {plan.period && <span style={{ fontSize: 13, color: t.txtDim }}>{plan.period}</span>}
                      </div>

                      {plan.discount_price && (
                        <div style={{ fontSize: 14, color: t.txtDim, textDecoration: "line-through", marginBottom: 8 }}>{plan.discount_price}</div>
                      )}

                      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14, marginTop: 12 }}>
                        {(plan.features || []).map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                            <span style={{ color: plan.accent_color || "#4ADE80", fontSize: 14, marginTop: 1 }}>✓</span>
                            <span style={{ fontSize: 13, color: t.txtSec, lineHeight: 1.4 }}>{f}</span>
                          </div>
                        ))}
                      </div>

                      {!isFreePlan && !isCurrent && (
                        <button style={{ width: "100%", marginTop: 16, background: plan.accent_color || accentColor, color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          Choose {plan.name}
                        </button>
                      )}
                      {isFreePlan && (
                        <div style={{ width: "100%", marginTop: 16, background: t.border, color: t.txtDim, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
                          {isCurrent ? "Your current plan" : "Included free"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Step: Confirm Payment */}
        {step === "confirm" && selectedPlan && (
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            <button onClick={() => { setStep("select"); setError(""); }} style={{ background: "transparent", border: "none", color: t.txtDim, fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0 }}>
              ← Back to plans
            </button>

            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Confirm Payment</h2>
            <p style={{ color: t.txtSec, fontSize: 14, marginBottom: 28 }}>
              You're upgrading to <strong style={{ color: selectedPlan.accent_color }}>{selectedPlan.name}</strong> — {selectedPlan.price} {selectedPlan.period}
            </p>

            {/* Order Summary */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: t.txtSec }}>Plan</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.txt }}>{selectedPlan.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: t.txtSec }}>Duration</span>
                <span style={{ fontSize: 14, color: t.txt }}>{selectedPlan.period}</span>
              </div>
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: t.txt }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: selectedPlan.accent_color }}>{selectedPlan.price}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.txtSec, marginBottom: 8 }}>Payment Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { id: "demo", label: "🧪 Demo", desc: "Free test" },
                  { id: "bkash", label: "📱 bKash", desc: "Mobile money" },
                  { id: "nagad", label: "📱 Nagad", desc: "Mobile money" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      background: paymentMethod === m.id ? `${accentColor}14` : t.card,
                      border: `2px solid ${paymentMethod === m.id ? accentColor : t.border}`,
                      borderRadius: 10,
                      padding: "14px 12px",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{m.label.split(" ")[0]}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: paymentMethod === m.id ? accentColor : t.txt }}>{m.label.split(" ")[1]}</div>
                    <div style={{ fontSize: 11, color: t.txtDim }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone number for bkash/nagad */}
            {(paymentMethod === "bkash" || paymentMethod === "nagad") && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.txtSec, marginBottom: 6 }}>Mobile Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  style={{ width: "100%", background: t.bg === "#FAFAFA" ? "#F4F4F5" : "#0F1420", border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 15, color: t.txt, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={processing}
              style={{
                width: "100%",
                background: processing ? t.txtDim : accentColor,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 700,
                cursor: processing ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
              }}
            >
              {processing ? "Processing..." : paymentMethod === "demo" ? "🧪 Complete Demo Payment" : `Pay ${selectedPlan.price}`}
            </button>

            {paymentMethod === "demo" && (
              <p style={{ fontSize: 12, color: t.txtDim, textAlign: "center", marginTop: 12 }}>
                This is a demo — no real payment will be charged.
              </p>
            )}
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1s linear infinite" }}>⚙️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Processing Payment...</h2>
            <p style={{ color: t.txtSec }}>Please don't close this page.</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Payment Successful!
            </h2>
            <p style={{ color: t.txtSec, fontSize: 16, marginBottom: 8 }}>
              You've been upgraded to <strong style={{ color: selectedPlan?.accent_color || accentColor }}>{selectedPlan?.name}</strong>
            </p>
            <p style={{ color: t.txtDim, fontSize: 14, marginBottom: 32 }}>
              All course content is now unlocked. Start learning!
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => navigate("/courses")}
                style={{ background: accentColor, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
              >
                Browse Courses →
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txt, borderRadius: 10, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
