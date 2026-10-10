import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CertificateView from '../components/CertificateView';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/Icon';

const makeStyles = (t) => ({
  page: { minHeight: '100vh', background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif", padding: '20px 40px' },
  header: { marginBottom: 40 },
  backLink: { color: t.txtDim, textDecoration: 'none', fontSize: 14 },
  title: { fontSize: 28, fontWeight: 800, color: t.txt, marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 },
  subtitle: { fontSize: 14, color: t.txtSec, marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 40 },
  statCard: { background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, textAlign: 'center' },
  statValue: { fontSize: 36, fontWeight: 800 },
  statLabel: { fontSize: 12, color: t.txtDim, marginTop: 4 },
  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: t.txt, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  table: { width: '100%', borderCollapse: 'collapse', background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: t.txtDim, textTransform: 'uppercase', borderBottom: `1px solid ${t.border}` },
  td: { padding: '12px 16px', fontSize: 14, borderBottom: `1px solid ${t.border}` },
  badge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 },
  loading: { textAlign: 'center', padding: 60, color: t.txtDim },
  empty: { textAlign: 'center', padding: 40, color: t.txtDim, fontSize: 14 },
  progressBar: { width: '100%', height: 6, background: t.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  courseCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, marginBottom: 8, textDecoration: 'none' },
  courseName: { fontSize: 15, fontWeight: 600, color: t.txt },
  courseMeta: { fontSize: 12, color: t.txtDim, marginTop: 4 },
});

export default function StudentProfile() {
  const { user, profile, signOut } = useAuth();
  const { colors: t } = useTheme();
  const S = makeStyles(t);
  const [stats, setStats] = useState({ totalPoints: 0, tasksPassed: 0, totalSubmissions: 0, coursesEnrolled: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [courseProgress, setCourseProgress] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      // Points
      const { data: points } = await supabase
        .from('points_ledger')
        .select('points')
        .eq('user_id', user.id);
      const totalPoints = (points || []).reduce((sum, p) => sum + p.points, 0);

      // Submissions
      const { data: subs } = await supabase
        .from('submissions')
        .select('*, tasks!inner(title, language, level_id, levels!inner(title, course_id, courses!inner(title)))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const tasksPassed = (subs || []).filter(s => s.passed).length;
      const totalSubmissions = (subs || []).length;
      setSubmissions(subs || []);

      // Course progress
      const { data: courses } = await supabase.from('courses').select('*, levels(*, tasks(*))');
      const progress = [];

      for (const course of (courses || [])) {
        let totalTasks = 0;
        let completedTasks = 0;
        for (const level of (course.levels || [])) {
          const levelTasks = (level.tasks || []).length;
          totalTasks += levelTasks;
          for (const task of (level.tasks || [])) {
            const hasPassed = (subs || []).some(s => s.task_id === task.id && s.passed);
            if (hasPassed) completedTasks++;
          }
        }
        if (totalTasks > 0) {
          progress.push({
            ...course,
            totalTasks,
            completedTasks,
            percentage: Math.round((completedTasks / totalTasks) * 100),
          });
        }
      }

      setStats({ totalPoints, tasksPassed, totalSubmissions, coursesEnrolled: progress.length });
      setCourseProgress(progress);

      // Fetch certificates
      const { data: certs } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      setCertificates(certs || []);

      setLoading(false);
    }
    fetchData();
  }, [user]);

  function handleSignOut() { signOut(); window.location.href = '/login'; }

  if (loading) return <div style={S.page}><div style={S.loading}>Loading profile...</div></div>;

  return (
    <div className="profile-page" style={S.page}>
      <div style={S.header}>
        <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
        <h1 style={S.title}><Icon name="user" size={26} /> My Profile</h1>
        <p style={S.subtitle}>{profile?.full_name || profile?.email}</p>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: t.accentLink }}>{stats.totalPoints}</div>
          <div style={S.statLabel}>Total Points</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: t.success }}>{stats.tasksPassed}</div>
          <div style={S.statLabel}>Tasks Passed</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: t.info }}>{stats.totalSubmissions}</div>
          <div style={S.statLabel}>Submissions</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: t.violet }}>{stats.coursesEnrolled}</div>
          <div style={S.statLabel}>Courses</div>
        </div>
      </div>

      {/* Course Progress */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}><Icon name="chart" size={18} /> Course Progress</h2>
        {courseProgress.length === 0 ? (
          <div style={S.empty}>
            You haven't started any courses yet.{' '}
            <Link to="/courses" style={{ color: t.accentLink }}>Browse courses →</Link>
          </div>
        ) : (
          courseProgress.map(c => (
            <Link key={c.id} to={`/courses/${c.id}`} style={S.courseCard}>
              <div>
                <div style={S.courseName}>{c.title}</div>
                <div style={S.courseMeta}>{c.completedTasks}/{c.totalTasks} tasks completed</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.percentage === 100 ? t.success : t.accentLink }}>{c.percentage}%</div>
                <div style={S.progressBar}>
                  <div style={{ ...S.progressFill, width: `${c.percentage}%`, background: c.percentage === 100 ? t.success : `linear-gradient(90deg, ${t.accent}, #ef4444)` }} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div style={S.section}>
          <h2 style={S.sectionTitle}><Icon name="award" size={18} /> Certificates Earned</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {certificates.map(cert => (
              <div key={cert.id} style={{
                background: 'linear-gradient(135deg, rgba(255,107,43,0.08), rgba(255,107,43,0.02))',
                border: '1px solid rgba(255,107,43,0.2)',
                borderRadius: 12,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 32, color: t.accent }}><Icon name="award" size={30} /></span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.txt }}>{cert.course_name}</div>
                    <div style={{ fontSize: 12, color: t.txtDim }}>Completed {new Date(cert.earned_at).toLocaleDateString()}</div>
                  </div>
                </div>
                {/* Visual certificate model — view only, no download */}
                <CertificateView
                  studentName={cert.student_name}
                  courseName={cert.course_name}
                  completionDate={cert.earned_at}
                  totalPoints={cert.total_points}
                  certificateId={cert.certificate_id}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}><Icon name="code" size={18} /> Recent Submissions</h2>
        {submissions.length === 0 ? (
          <div style={S.empty}>No submissions yet. Complete tasks to see them here.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Task</th>
                <th style={S.th}>Course</th>
                <th style={S.th}>Language</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Points</th>
                <th style={S.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {submissions.slice(0, 20).map(sub => (
                <tr key={sub.id}>
                  <td style={S.td}>{sub.tasks?.title || '—'}</td>
                  <td style={{ ...S.td, fontSize: 13, color: t.txtDim }}>{sub.tasks?.levels?.courses?.title || '—'}</td>
                  <td style={{ ...S.td, fontSize: 13, color: t.txtDim }}>{sub.language}</td>
                  <td style={S.td}>
                    <span style={{
                      ...S.badge,
                      background: sub.passed ? 'rgba(62,207,142,0.12)' : 'rgba(248,113,113,0.12)',
                      color: sub.passed ? t.success : t.danger,
                    }}>
                      {sub.passed ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: sub.passed ? t.accentLink : t.txtDim, fontWeight: 600 }}>
                    {sub.passed ? `+${sub.points_awarded}` : '—'}
                  </td>
                  <td style={{ ...S.td, fontSize: 12, color: t.txtDim, whiteSpace: 'nowrap' }}>
                    {new Date(sub.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-page { padding: 16px !important; }
          .profile-page table { font-size: 12px !important; }
          .profile-page th:nth-child(3),
          .profile-page td:nth-child(3) { display: none !important; }
          .profile-page th:nth-child(6),
          .profile-page td:nth-child(6) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
