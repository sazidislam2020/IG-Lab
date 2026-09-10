import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CertificateView from '../components/CertificateView';

const S = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter',sans-serif", padding: '20px 40px' },
  header: { marginBottom: 40 },
  backLink: { color: '#888', textDecoration: 'none', fontSize: 14 },
  title: { fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 40 },
  statCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, textAlign: 'center' },
  statValue: { fontSize: 36, fontWeight: 800 },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#5C6478', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td: { padding: '12px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' },
  badge: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 },
  loading: { textAlign: 'center', padding: 60, color: '#666' },
  empty: { textAlign: 'center', padding: 40, color: '#5C6478', fontSize: 14 },
  progressBar: { width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  courseCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8, textDecoration: 'none' },
  courseName: { fontSize: 15, fontWeight: 600, color: '#fff' },
  courseMeta: { fontSize: 12, color: '#888', marginTop: 4 },
};

export default function StudentProfile() {
  const { user, profile, signOut } = useAuth();
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
        <h1 style={S.title}>👤 My Profile</h1>
        <p style={S.subtitle}>{profile?.full_name || profile?.email}</p>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: '#f97316' }}>{stats.totalPoints}</div>
          <div style={S.statLabel}>Total Points</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: '#3ECF8E' }}>{stats.tasksPassed}</div>
          <div style={S.statLabel}>Tasks Passed</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: '#38BDF8' }}>{stats.totalSubmissions}</div>
          <div style={S.statLabel}>Submissions</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statValue, color: '#A78BFA' }}>{stats.coursesEnrolled}</div>
          <div style={S.statLabel}>Courses</div>
        </div>
      </div>

      {/* Course Progress */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>📊 Course Progress</h2>
        {courseProgress.length === 0 ? (
          <div style={S.empty}>
            You haven't started any courses yet.{' '}
            <Link to="/courses" style={{ color: '#f97316' }}>Browse courses →</Link>
          </div>
        ) : (
          courseProgress.map(c => (
            <Link key={c.id} to={`/courses/${c.id}`} style={S.courseCard}>
              <div>
                <div style={S.courseName}>{c.title}</div>
                <div style={S.courseMeta}>{c.completedTasks}/{c.totalTasks} tasks completed</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.percentage === 100 ? '#3ECF8E' : '#f97316' }}>{c.percentage}%</div>
                <div style={S.progressBar}>
                  <div style={{ ...S.progressFill, width: `${c.percentage}%`, background: c.percentage === 100 ? '#3ECF8E' : 'linear-gradient(90deg,#f97316,#ef4444)' }} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div style={S.section}>
          <h2 style={S.sectionTitle}>🏆 Certificates Earned</h2>
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
                  <span style={{ fontSize: 32 }}>🎓</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{cert.course_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Completed {new Date(cert.earned_at).toLocaleDateString()}</div>
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
        <h2 style={S.sectionTitle}>📝 Recent Submissions</h2>
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
                  <td style={{ ...S.td, fontSize: 13, color: '#888' }}>{sub.tasks?.levels?.courses?.title || '—'}</td>
                  <td style={{ ...S.td, fontSize: 13, color: '#888' }}>{sub.language}</td>
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
                  <td style={{ ...S.td, fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
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
