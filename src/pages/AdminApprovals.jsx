import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

export default function AdminApprovals() {
  const { profile, signOut } = useAuth();
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  async function fetchUsers() {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function handleApprove(userId) {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", userId);

    if (error) {
      console.error("Error approving user:", error);
      alert("Failed to approve user: " + error.message);
    } else {
      // Log the action
      await supabase.from("audit_log").insert({
        actor_id: profile.id,
        action: "approve_user",
        target_user_id: userId,
        details: { approved_at: new Date().toISOString() },
      });
      fetchUsers();
    }
    setActionLoading(null);
  }

  async function handleReject(userId) {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", userId);

    if (error) {
      console.error("Error rejecting user:", error);
      alert("Failed to reject user: " + error.message);
    } else {
      await supabase.from("audit_log").insert({
        actor_id: profile.id,
        action: "reject_user",
        target_user_id: userId,
        details: { rejected_at: new Date().toISOString() },
      });
      fetchUsers();
    }
    setActionLoading(null);
  }

  async function handleRoleChange(userId, newRole) {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role: " + error.message);
    } else {
      await supabase.from("audit_log").insert({
        actor_id: profile.id,
        action: "assign_role",
        target_user_id: userId,
        details: { new_role: newRole },
      });
      fetchUsers();
    }
    setActionLoading(null);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const pendingCount = users.filter(
    (u) => filter === "all" || true
  ).length;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.brand}>
          <span style={styles.spark} /> IGNITE LAB
          <span style={styles.adminBadge}>SUPER ADMIN</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userName}>{profile?.email}</span>
          <button onClick={handleSignOut} style={styles.signOutBtn}>Sign out</button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>User Approvals</h1>
          <p style={styles.subtitle}>Review and manage new account registrations</p>
        </div>

        <div style={styles.filters}>
          {["pending", "approved", "rejected", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={styles.empty}>
            <p>No {filter !== "all" ? filter : ""} users found.</p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.full_name || "—"}</td>
                    <td style={styles.td}>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                        disabled={actionLoading === user.id}
                        style={styles.select}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge(user.status)}>
                        {user.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      {user.status === "pending" && (
                        <div style={styles.actions}>
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={actionLoading === user.id}
                            style={styles.approveBtn}
                          >
                            {actionLoading === user.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            disabled={actionLoading === user.id}
                            style={styles.rejectBtn}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {user.status === "approved" && (
                        <button
                          onClick={() => handleReject(user.id)}
                          disabled={actionLoading === user.id}
                          style={styles.rejectBtn}
                        >
                          Revoke
                        </button>
                      )}
                      {user.status === "rejected" && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          style={styles.approveBtn}
                        >
                          Re-approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.backLink}>
          <a href="/dashboard" style={styles.link}>← Back to Dashboard</a>
        </div>
      </main>
    </div>
  );
}

const makeStyles = (t) => ({
  page: { minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "Inter, system-ui, sans-serif", transition: "background 0.3s, color 0.3s" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${t.border}`, background: t.bg === "#FAFAFA" ? "rgba(255,255,255,0.92)" : "rgba(10,14,22,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 },
  brand: { display: "flex", alignItems: "center", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: t.txt },
  spark: { width: 9, height: 9, background: "#FF6B2B", borderRadius: 2, transform: "rotate(45deg)", boxShadow: "0 0 10px #FF6B2B" },
  adminBadge: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#FF6B2B", border: "1px solid rgba(255,107,43,0.4)", background: "rgba(255,107,43,0.14)", padding: "3px 8px", borderRadius: 100, marginLeft: 8 },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  userName: { fontSize: 14, color: t.txtSec },
  signOutBtn: { background: "transparent", border: `1px solid ${t.border}`, color: t.txt, padding: "8px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer" },
  main: { maxWidth: 1180, margin: "0 auto", padding: "40px 32px" },
  header: { marginBottom: 32 },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6, color: t.txt },
  subtitle: { color: t.txtSec, fontSize: 15 },
  filters: { display: "flex", gap: 8, marginBottom: 24 },
  filterBtn: { padding: "8px 18px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.txtSec, fontSize: 13, cursor: "pointer", fontWeight: 500 },
  filterBtnActive: { background: "#FF6B2B", color: "#fff", border: "1px solid #FF6B2B" },
  loading: { textAlign: "center", color: t.txtSec, padding: 40 },
  empty: { textAlign: "center", color: t.txtSec, padding: 60, background: t.card, borderRadius: 12, border: `1px solid ${t.border}` },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: `1px solid ${t.border}` },
  table: { width: "100%", borderCollapse: "collapse", background: t.card },
  th: { textAlign: "left", padding: "14px 16px", fontSize: 12, fontWeight: 600, color: t.txtDim, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}`, fontFamily: "'JetBrains Mono', monospace" },
  tr: { borderBottom: `1px solid ${t.border}` },
  td: { padding: "14px 16px", fontSize: 14, color: t.txt },
  select: { background: t.bg === "#FAFAFA" ? "#F4F4F5" : "#0F1420", border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13, color: t.txt, cursor: "pointer" },
  statusBadge: (status) => ({
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "4px 10px", borderRadius: 100, display: "inline-block",
    ...(status === "pending" ? { color: "#FFB238", border: "1px solid rgba(255,178,56,0.4)", background: "rgba(255,178,56,0.1)" } :
       status === "approved" ? { color: "#3ECF8E", border: "1px solid rgba(62,207,142,0.4)", background: "rgba(62,207,142,0.1)" } :
       { color: "#F87171", border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.1)" })
  }),
  actions: { display: "flex", gap: 8 },
  approveBtn: { padding: "6px 14px", borderRadius: 6, border: "none", background: "#3ECF8E", color: t.bg, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  rejectBtn: { padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.4)", background: "transparent", color: "#F87171", fontSize: 13, cursor: "pointer" },
  backLink: { marginTop: 32 },
  link: { color: "#FF6B2B", textDecoration: "none", fontSize: 14 },
});
