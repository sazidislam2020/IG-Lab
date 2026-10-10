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
  topThree: { display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' },
  podium: { textAlign: 'center', padding: '24px 20px', borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, width: 180, position: 'relative' },
  podiumGold: { border: '1px solid rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.05)' },
  podiumSilver: { border: '1px solid rgba(192,192,192,0.3)', background: 'rgba(192,192,192,0.05)' },
  podiumBronze: { border: '1px solid rgba(205,127,50,0.3)', background: 'rgba(205,127,50,0.05)' },
  rank: { fontSize: 36, marginBottom: 8, display: 'flex', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: 700, color: t.txt, marginBottom: 4 },
  points: { fontSize: 24, fontWeight: 800, marginBottom: 2 },
  pointsLabel: { fontSize: 11, color: t.txtDim, textTransform: 'uppercase', letterSpacing: 1 },
  list: { maxWidth: 700, margin: '0 auto' },
  listHeader: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: t.txtDim, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` },
  row: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '14px 20px', alignItems: 'center', borderBottom: `1px solid ${t.border}`, transition: 'background 0.15s' },
  rowMe: { background: 'rgba(249,115,22,0.08)', borderLeft: '3px solid #f97316' },
  rankNum: { fontSize: 16, fontWeight: 700, color: t.txtDim },
  studentName: { fontSize: 14, fontWeight: 600, color: t.txt },
  studentEmail: { fontSize: 12, color: t.txtDim },
  pointsVal: { fontSize: 16, fontWeight: 700, color: t.accentLink },
  tasksVal: { fontSize: 13, color: t.txtDim },
  loading: { textAlign: 'center', padding: 60, color: t.txtDim },
  empty: { textAlign: 'center', padding: 60, color: t.txtDim },
});

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function Leaderboard() {
  const { user } = useAuth();
  const { colors: t } = useTheme();
  const S = makeStyles(t);
  const podiumStyles = [S.podiumGold, S.podiumSilver, S.podiumBronze];
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Server-side aggregate: names + totals without exposing
      // profiles emails or raw points_ledger rows to students.
      const { data: board } = await supabase.rpc('get_leaderboard', { p_limit: 500 });
      const enriched = (board || []).map((r) => ({
        id: r.user_id,
        full_name: r.display_name,
        totalPoints: Number(r.total_points),
        passedCount: Number(r.tasks_passed),
      }));
      setStudents(enriched);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div style={S.page}><div style={S.loading}>Loading leaderboard...</div></div>;

  const topThree = students.slice(0, 3);
  const rest = students.slice(3);

  return (
    <div className="leaderboard-page" style={S.page}>
      <div style={S.header}>
        <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
        <h1 style={S.title}><Icon name="award" size={26} /> Leaderboard</h1>
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
                  <div style={S.rank}><Icon name="award" size={30} strokeWidth={2} style={{ color: medalColors[i] }} /></div>
                  <div style={S.name}>{s.full_name || s.email?.split('@')[0]}</div>
                  <div style={{ ...S.points, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }}>
                    {s.totalPoints}
                  </div>
                  <div style={S.pointsLabel}>points</div>
                  <div style={{ fontSize: 12, color: t.txtSec, marginTop: 4 }}>{s.passedCount} tasks passed</div>
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
                  <span style={{ ...S.rankNum, color: isMe ? t.accentLink : t.txtDim }}>{i + 4}</span>
                  <div>
                    <div style={S.studentName}>{s.full_name || 'No name'}{isMe ? ' (you)' : ''}</div>
                  </div>
                  <span style={S.pointsVal}>{s.totalPoints}</span>
                  <span style={S.tasksVal}>{s.passedCount}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .leaderboard-page { padding: 16px !important; }
          .leaderboard-page .topThree { gap: 12px !important; }
          .leaderboard-page .podium { width: 140px !important; padding: 16px 12px !important; }
          .leaderboard-page .listHeader,
          .leaderboard-page .row { grid-template-columns: 40px 1fr 80px !important; padding: 10px 12px !important; }
          .leaderboard-page .listHeader span:last-child,
          .leaderboard-page .row > span:last-child { display: none !important; }
        }
      `}</style>
    </div>
  );
}
