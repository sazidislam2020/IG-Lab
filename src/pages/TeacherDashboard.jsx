import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const S = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter',sans-serif" },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,14,22,0.92)', backdropFilter: 'blur(6px)', position: 'sticky', top: 0, zIndex: 100 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16 },
  spark: { width: 9, height: 9, background: '#f97316', borderRadius: 2, transform: 'rotate(45deg)', boxShadow: '0 0 10px #f97316' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  signOutBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', color: '#e0e0e0', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  main: { maxWidth: 1180, margin: '0 auto', padding: '40px 32px' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 800, color: '#fff' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 40 },
  statCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 },
  statValue: { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#888' },
  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#5C6478', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' },
  badge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 },
  loading: { textAlign: 'center', padding: 60, color: '#666' },
  empty: { textAlign: 'center', padding: 40, color: '#5C6478', fontSize: 14 },
  viewAll: { color: '#f97316', textDecoration: 'none', fontSize: 13, fontWeight: 600 },
};

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, activeToday: 0, totalSubmissions: 0, avgPoints: 0 });
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch stats
      const [studentsRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student').eq('status', 'approved'),
        supabase.from('submissions').select('*'),
      ]);

      const totalStudents = studentsRes.count || 0;
      const totalSubmissions = subsRes.data?.length || 0;

      // Fetch students with points
      const { data: students } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('role', 'student')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get points for each student
      const studentsWithPoints = await Promise.all(
        (students || []).map(async (s) => {
          const { data: points } = await supabase
            .from('points_ledger')
            .select('points')
            .eq('user_id', s.id);
          const totalPoints = (points || []).reduce((sum, p) => sum + p.points, 0);

          const { count: subCount } = await supabase
            .from('submissions')
            .select('id', { count: 'exact' })
            .eq('user_id', s.id);

          const { count: passedCount } = await supabase
            .from('submissions')
            .select('id', { count: 'exact' })
            .eq('user_id', s.id)
            .eq('passed', true);

          return { ...s, totalPoints, subCount: subCount || 0, passedCount: passedCount || 0 };
        })
      );

      // Recent submissions
      const { data: recentSubs } = await supabase
        .from('submissions')
        .select('*, profiles!inner(email, full_name), tasks!inner(title)')
        .order('created_at', { ascending: false })
        .limit(10);

      const avgPoints = studentsWithPoints.length > 0
        ? Math.round(studentsWithPoints.reduce((sum, s) => sum + s.totalPoints, 0) / studentsWithPoints.length)
        : 0;

      setStats({ totalStudents, activeToday: 0, totalSubmissions, avgPoints });
      setRecentStudents(studentsWithPoints);
      setRecentSubmissions(recentSubs || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  function handleSignOut() {
    signOut();
    window.location.href = '/login';
  }

  if (loading) return <div style={S.page}><div style={S.loading}>Loading teacher dashboard...</div></div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link to="/dashboard" style={{ ...S.brand, textDecoration: 'none', color: '#e0e0e0' }}>
          <span style={S.spark} /> IGNITE LAB
        </Link>
        <div style={S.navRight}>
          <span style={{ fontSize: 13, color: '#2FD1D6', border: '1px solid rgba(47,209,214,0.3)', padding: '4px 10px', borderRadius: 100 }}>Teacher</span>
          <span style={{ fontSize: 14, color: '#888' }}>{profile?.email}</span>
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign out</button>
        </div>
      </nav>

      <main style={S.main}>
        <div style={S.header}>
          <h1 style={S.title}>Teacher Dashboard</h1>
          <p style={S.subtitle}>Monitor student progress and track learning outcomes</p>
        </div>

        {/* Stats */}
        <div style={S.statsGrid}>
          <div style={S.statCard}>
            <div style={{ ...S.statValue, color: '#3ECF8E' }}>{stats.totalStudents}</div>
            <div style={S.statLabel}>Total Students</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statValue, color: '#38BDF8' }}>{stats.totalSubmissions}</div>
            <div style={S.statLabel}>Total Submissions</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statValue, color: '#f97316' }}>{stats.avgPoints}</div>
            <div style={S.statLabel}>Avg Points/Student</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statValue, color: '#A78BFA' }}>
              {stats.totalStudents > 0 ? Math.round((recentSubmissions.filter(s => s.passed).length / Math.max(stats.totalSubmissions, 1)) * 100) : 0}%
            </div>
            <div style={S.statLabel}>Pass Rate</div>
          </div>
        </div>

        {/* Students Table */}
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={S.sectionTitle}>Students</h2>
            <Link to="/teacher/students" style={S.viewAll}>View all →</Link>
          </div>
          {recentStudents.length === 0 ? (
            <div style={S.empty}>No approved students yet</div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Student</th>
                    <th style={S.th}>Points</th>
                    <th style={S.th}>Submissions</th>
                    <th style={S.th}>Passed</th>
                    <th style={S.th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map(s => (
                    <tr key={s.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{s.full_name || 'No name'}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{s.email}</div>
                      </td>
                      <td style={S.td}><span style={{ color: '#f97316', fontWeight: 700 }}>{s.totalPoints}</span></td>
                      <td style={S.td}>{s.subCount}</td>
                      <td style={S.td}>
                        <span style={{ ...S.badge, background: 'rgba(62,207,142,0.12)', color: '#3ECF8E' }}>{s.passedCount}</span>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, color: '#666' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div style={S.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Recent Submissions</h2>
            <Link to="/teacher/review" style={S.viewAll}>📝 Review & Grade →</Link>
          </div>
          {recentSubmissions.length === 0 ? (
            <div style={S.empty}>No submissions yet</div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Student</th>
                    <th style={S.th}>Task</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Points</th>
                    <th style={S.th}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map(sub => (
                    <tr key={sub.id}>
                      <td style={S.td}>
                        <div style={{ fontSize: 13 }}>{sub.profiles?.full_name || sub.profiles?.email}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ fontSize: 13 }}>{sub.tasks?.title}</div>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          ...S.badge,
                          background: sub.passed ? 'rgba(62,207,142,0.12)' : 'rgba(248,113,113,0.12)',
                          color: sub.passed ? '#3ECF8E' : '#F87171',
                        }}>
                          {sub.passed ? '✅ Pass' : '❌ Fail'}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: sub.passed ? '#f97316' : '#666', fontWeight: 600 }}>
                        {sub.passed ? `+${sub.points_awarded}` : '—'}
                      </td>
                      <td style={{ ...S.td, fontSize: 12, color: '#666' }}>
                        {new Date(sub.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
