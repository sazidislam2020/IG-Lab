import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const S = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter',sans-serif", padding: '20px 40px' },
  header: { marginBottom: 40 },
  backLink: { color: '#888', textDecoration: 'none', fontSize: 14 },
  title: { fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#5C6478', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' },
  badge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 },
  loading: { textAlign: 'center', padding: 60, color: '#666' },
  empty: { textAlign: 'center', padding: 60, color: '#5C6478' },
};

const actionColors = {
  approve_user: { bg: 'rgba(62,207,142,0.12)', color: '#3ECF8E', label: 'Approved' },
  reject_user: { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Rejected' },
  revoke_user: { bg: 'rgba(255,178,56,0.12)', color: '#FFB238', label: 'Revoked' },
  assign_role: { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Role Changed' },
};

export default function AuditLog() {
  const { profile, signOut } = useAuth();
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
    <div style={S.page}>
      <div style={S.header}>
        <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
        <h1 style={S.title}>📋 Audit Log</h1>
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
              const style = actionColors[log.action] || { bg: 'rgba(255,255,255,0.05)', color: '#888', label: log.action };
              return (
                <tr key={log.id}>
                  <td style={S.td}>
                    <span style={{ ...S.badge, background: style.bg, color: style.color }}>{style.label}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{log.profiles?.full_name || log.profiles?.email || 'System'}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 13, color: '#aaa' }}>{log.details?.target_email || '—'}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {log.action === 'assign_role' ? `Role → ${log.details?.new_role}` : log.action}
                    </div>
                  </td>
                  <td style={{ ...S.td, fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
