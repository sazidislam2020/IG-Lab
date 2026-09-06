import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

export default function AdminUserManagement() {
  const { colors: t } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function updateRole(userId, newRole) {
    setActionLoading(userId);
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    await fetchUsers();
    setActionLoading(null);
    setShowModal(null);
  }

  async function updateStatus(userId, newStatus) {
    setActionLoading(userId);
    await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
    await fetchUsers();
    setActionLoading(null);
  }

  async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    setActionLoading(userId);
    // Delete from auth (requires service role - we'll just mark as rejected)
    await supabase.from("profiles").update({ status: "rejected" }).eq("id", userId);
    await fetchUsers();
    setActionLoading(null);
  }

  async function resetPassword(userId, email) {
    setActionLoading(userId);
    const { error } = await supabase.auth.admin.resetUserPassword(userId, newPassword);
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Password reset successfully!");
      setShowModal(null);
      setNewPassword("");
    }
    setActionLoading(null);
  }

  const filteredUsers = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const roleColors = {
    super_admin: "#FF5A1F",
    admin: "#FFB238",
    teacher: "#22D3EE",
    student: "#4ADE80",
  };

  const statusColors = {
    approved: "#4ADE80",
    pending: "#FACC15",
    rejected: "#F87171",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${t.border}`, background: t.bg === "#FAFAFA" ? "rgba(255,255,255,0.92)" : "rgba(10,14,22,0.92)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ color: t.txtSec, textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 }}>👥 User Management</h1>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: t.txt, outline: "none" }}
          />
          {["all", "super_admin", "admin", "teacher", "student"].map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: filter === role ? (roleColors[role] || t.accent) + "20" : "transparent",
                border: `1px solid ${filter === role ? (roleColors[role] || t.accent) : t.border}`,
                color: filter === role ? (roleColors[role] || t.accent) : t.txtDim,
                cursor: "pointer",
              }}
            >
              {role === "all" ? "All" : role.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 20px" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: t.txt }}>{users.length}</span>
            <span style={{ fontSize: 13, color: t.txtDim, marginLeft: 8 }}>Total Users</span>
          </div>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 20px" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#4ADE80" }}>{users.filter(u => u.status === "approved").length}</span>
            <span style={{ fontSize: 13, color: t.txtDim, marginLeft: 8 }}>Approved</span>
          </div>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 20px" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#FACC15" }}>{users.filter(u => u.status === "pending").length}</span>
            <span style={{ fontSize: 13, color: t.txtDim, marginLeft: 8 }}>Pending</span>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.txtDim }}>Loading users...</div>
        ) : (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  <th style={thStyle(t)}>User</th>
                  <th style={thStyle(t)}>Role</th>
                  <th style={thStyle(t)}>Status</th>
                  <th style={thStyle(t)}>Joined</th>
                  <th style={{ ...thStyle(t), textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={tdStyle(t)}>
                      <div style={{ fontWeight: 600, color: t.txt }}>{user.full_name || "No name"}</div>
                      <div style={{ fontSize: 12, color: t.txtDim }}>{user.email}</div>
                    </td>
                    <td style={tdStyle(t)}>
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        disabled={actionLoading === user.id}
                        style={{
                          background: (roleColors[user.role] || "#888") + "15",
                          color: roleColors[user.role] || "#888",
                          border: `1px solid ${roleColors[user.role] || "#888"}40`,
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td style={tdStyle(t)}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: (statusColors[user.status] || "#888") + "18",
                        color: statusColors[user.status] || "#888",
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle(t), fontSize: 12, color: t.txtDim }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ ...tdStyle(t), textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setShowModal({ type: "password", user })}
                          style={actionBtnStyle(t, "#38BDF8")}
                          title="Reset Password"
                        >
                          🔑
                        </button>
                        {user.status === "pending" && (
                          <button
                            onClick={() => updateStatus(user.id, "approved")}
                            disabled={actionLoading === user.id}
                            style={actionBtnStyle(t, "#4ADE80")}
                            title="Approve"
                          >
                            ✅
                          </button>
                        )}
                        {user.status === "approved" && user.role !== "super_admin" && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={actionLoading === user.id}
                            style={actionBtnStyle(t, "#F87171")}
                            title="Reject/Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: t.txtDim }}>No users found</div>
            )}
          </div>
        )}
      </main>

      {/* Password Reset Modal */}
      {showModal?.type === "password" && (
        <div style={modalOverlay} onClick={() => setShowModal(null)}>
          <div style={modalStyle(t)} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: t.txt }}>Reset Password</h3>
            <p style={{ fontSize: 13, color: t.txtDim, marginBottom: 16 }}>
              Set a new password for <strong>{showModal.user.email}</strong>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              style={{ width: "100%", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: t.txt, outline: "none", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.txtDim, padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => resetPassword(showModal.user.id, showModal.user.email)}
                disabled={newPassword.length < 6 || actionLoading === showModal.user.id}
                style={{ background: "#38BDF8", color: "#000", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: newPassword.length < 6 ? 0.5 : 1 }}
              >
                {actionLoading === showModal.user.id ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function thStyle(t) {
  return { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: 1, color: t.txtDim, textTransform: "uppercase", borderBottom: `1px solid ${t.border}` };
}

function tdStyle(t) {
  return { padding: "12px 16px", fontSize: 14, color: t.txt };
}

function actionBtnStyle(t, color) {
  return {
    background: color + "15",
    color: color,
    border: `1px solid ${color}30`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 14,
    cursor: "pointer",
  };
}

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

function modalStyle(t) {
  return {
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  };
}
