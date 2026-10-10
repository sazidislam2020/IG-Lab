import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/Icon';

const makeStyles = (t) => ({
  page: { minHeight: '100vh', background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif", padding: '20px 40px' },
  header: { marginBottom: 40 },
  backLink: { color: t.txtDim, textDecoration: 'none', fontSize: 14 },
  title: { fontSize: 28, fontWeight: 800, color: t.txt, marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 },
  subtitle: { fontSize: 14, color: t.txtSec, marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: t.txtDim, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: `1px solid ${t.border}` },
  badge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 },
  loading: { textAlign: 'center', padding: 60, color: t.txtDim },
  empty: { textAlign: 'center', padding: 60, color: t.txtDim },
});

const actionColors = {
  approve_user: { bg: 'rgba(62,207,142,0.12)', color: '#3ECF8E', label: 'Approved' },
  reject_user: { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Rejected' },
  revoke_user: { bg: 'rgba(255,178,56,0.12)', color: '#FFB238', label: 'Revoked' },
  assign_role: { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Role Changed' },
};

export default function AuditLog() {
  const { profile, signOut } = useAuth();
  const { colors: t } = useTheme();
  const S = makeStyles(t);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('audit_log')
        .select('*, profiles!audit_log_actor_id_fkey(email, full_name), profiles!audit_log_target_user_id_fkey(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  function handleSignOut() { signOut(); window.location.href = '/login'; }

  if (loading) return <div style={S.page}><div style={S.loading}>Loading audit log...</div></div>;

  return (
    <div className="admin-page" style={S.page}>
      <div style={S.header}>
        <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
        <h1 style={S.title}><Icon name="clock" size={26} /> Audit Log</h1>
        <p style={S.subtitle}>All admin actions across the platform</p>
      </div>

      {logs.length === 0 ? (
        <div style={S.empty}>No audit log entries yet. Actions like approvals and role changes will appear here.</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Action</th>
              <th style={S.th}>Actor</th>
              <th style={S.th}>Target</th>
              <th style={S.th}>Details</th>
              <th style={S.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const style = actionColors[log.action] || { bg: t.card, color: t.txtDim, label: log.action };
              return (
                <tr key={log.id}>
                  <td style={S.td}>
                    <span style={{ ...S.badge, background: style.bg, color: style.color }}>{style.label}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.txt }}>{log.profiles?.full_name || log.profiles?.email || 'System'}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 13, color: t.txtSec }}>{log.details?.target_email || '—'}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 12, color: t.txtDim }}>
                      {log.action === 'assign_role' ? `Role → ${log.details?.new_role}` : log.action}
                    </div>
                  </td>
                  <td style={{ ...S.td, fontSize: 12, color: t.txtDim, whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-page { padding: 16px !important; }
          .admin-page table { font-size: 12px !important; }
          .admin-page th:nth-child(3),
          .admin-page td:nth-child(3) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
