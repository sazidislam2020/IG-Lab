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
  topThree: { display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' },
  podium: { textAlign: 'center', padding: '24px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', width: 180, position: 'relative' },
  podiumGold: { border: '1px solid rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.05)' },
  podiumSilver: { border: '1px solid rgba(192,192,192,0.3)', background: 'rgba(192,192,192,0.05)' },
  podiumBronze: { border: '1px solid rgba(205,127,50,0.3)', background: 'rgba(205,127,50,0.05)' },
  rank: { fontSize: 36, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  points: { fontSize: 24, fontWeight: 800, marginBottom: 2 },
  pointsLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  list: { maxWidth: 700, margin: '0 auto' },
  listHeader: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#5C6478', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  row: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' },
  rowMe: { background: 'rgba(249,115,22,0.08)', borderLeft: '3px solid #f97316' },
  rankNum: { fontSize: 16, fontWeight: 700, color: '#888' },
  studentName: { fontSize: 14, fontWeight: 600, color: '#fff' },
  studentEmail: { fontSize: 12, color: '#666' },
  pointsVal: { fontSize: 16, fontWeight: 700, color: '#f97316' },
  tasksVal: { fontSize: 13, color: '#888' },
  loading: { textAlign: 'center', padding: 60, color: '#666' },
  empty: { textAlign: 'center', padding: 60, color: '#5C6478' },
};

const medals = ['🥇', '🥈', '🥉'];
const podiumStyles = [S.podiumGold, S.podiumSilver, S.podiumBronze];

export default function Leaderboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Get all approved students
      const { data: allStudents } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'student')
        .eq('status', 'approved');

      if (!allStudents) { setLoading(false); return; }

      // Get points for each student
      const enriched = await Promise.all(
        allStudents.map(async (s) => {
          const { data: points } = await supabase
            .from('points_ledger')
            .select('points')
            .eq('user_id', s.id);
          const totalPoints = (points || []).reduce((sum, p) => sum + p.points, 0);

          const { count: passedCount } = await supabase
            .from('submissions')
            .select('id', { count: 'exact' })
            .eq('user_id', s.id)
            .eq('passed', true);

          return { ...s, totalPoints, passedCount: passedCount || 0 };
        })
      );

      // Sort by points descending
      enriched.sort((a, b) => b.totalPoints - a.totalPoints || b.passedCount - a.passedCount);
      setStudents(enriched);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div style={S.page}><div style={S.loading}>Loading leaderboard...</div></div>;

  const topThree = students.slice(0, 3);
  const rest = students.slice(3);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
        <h1 style={S.title}>🏆 Leaderboard</h1>
        <p style={S.subtitle}>Top performers across all courses</p>
      </div>

      {students.length === 0 ? (
        <div style={S.empty}>No students on the leaderboard yet. Complete tasks to earn points!</div>
      ) : (
        <>
          {/* Top 3 podium */}
          {topThree.length > 0 && (
            <div style={S.topThree}>
              {topThree.map((s, i) => (
                <div key={s.id} style={{ ...S.podium, ...podiumStyles[i], order: i === 1 ? -1 : 0 }}>
                  <div style={S.rank}>{medals[i]}</div>
                  <div style={S.name}>{s.full_name || s.email?.split('@')[0]}</div>
                  <div style={{ ...S.points, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }}>
                    {s.totalPoints}
                  </div>
                  <div style={S.pointsLabel}>points</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.passedCount} tasks passed</div>
                </div>
              ))}
            </div>
          )}

          {/* Full list */}
          <div style={S.list}>
            <div style={S.listHeader}>
              <span>#</span>
              <span>Student</span>
              <span>Points</span>
              <span>Tasks</span>
            </div>
            {rest.map((s, i) => {
              const isMe = s.id === user?.id;
              return (
                <div key={s.id} style={isMe ? { ...S.row, ...S.rowMe } : S.row}>
                  <span style={{ ...S.rankNum, color: isMe ? '#f97316' : '#888' }}>{i + 4}</span>
                  <div>
                    <div style={S.studentName}>{s.full_name || 'No name'}{isMe ? ' (you)' : ''}</div>
                    <div style={S.studentEmail}>{s.email}</div>
                  </div>
                  <span style={S.pointsVal}>{s.totalPoints}</span>
                  <span style={S.tasksVal}>{s.passedCount}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
