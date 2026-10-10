import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/Icon';

const makeStyles = (t) => ({
  page: { minHeight: '100vh', background: t.bg, color: t.txt, fontFamily: "'Inter',sans-serif" },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: `1px solid ${t.border}`, background: t.surface, position: 'sticky', top: 0, zIndex: 100 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16 },
  spark: { width: 9, height: 9, background: t.accent, borderRadius: 2, transform: 'rotate(45deg)', boxShadow: '0 0 10px #f97316' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  signOutBtn: { background: 'transparent', border: `1px solid ${t.borderLight}`, color: t.txt, padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  main: { maxWidth: 1180, margin: '0 auto', padding: '40px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 800, color: t.txt },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${t.accent}, #ef4444)`, color: t.accentInk, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: t.txtDim, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { background: 'rgba(239,68,68,0.12)', color: t.danger, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  card: { background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, marginBottom: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 700, color: t.txt },
  cardDesc: { fontSize: 14, color: t.txtDim, marginBottom: 12 },
  cardMeta: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  badge: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: 'rgba(249,115,22,0.12)', color: t.accentLink },
  badgeBlue: { fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: 'rgba(56,189,248,0.12)', color: t.info },
  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: t.card, border: `1px solid ${t.borderLight}`, borderRadius: 16, padding: 32, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: t.txt, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: t.txtDim, marginBottom: 6, marginTop: 16 },
  input: { width: '100%', background: t.bg, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, color: t.txt, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', background: t.bg, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, color: t.txt, outline: 'none', minHeight: 80, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', background: t.bg, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, color: t.txt, outline: 'none', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 },
  loading: { textAlign: 'center', padding: 60, color: t.txtDim },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, color: t.txtDim, transition: 'all 0.15s' },
  tabActive: { background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)', color: t.accentLink },
  list: { marginTop: 16 },
  listItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 8 },
  listItemInfo: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: 600, color: t.txt },
  listItemMeta: { fontSize: 12, color: t.txtDim, marginTop: 2 },
  btnSmall: { padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none', marginLeft: 8 },
  empty: { textAlign: 'center', padding: 40, color: t.txtDim, fontSize: 14 },
});

const LANGUAGES = ['python', 'javascript', 'java', 'c', 'cpp', 'html', 'css'];

const MODULE_ICONS = { live: 'video', classwork: 'code', homework: 'check', boss: 'bolt' };
const MODULE_TYPES = ['live', 'classwork', 'homework', 'boss'];

export default function AdminCourses() {
  const { colors: t } = useTheme();
  const S = makeStyles(t);
  const { profile, signOut } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // 'course', 'module', 'task'
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('courses');
  const [toggling, setToggling] = useState(null);

  // Certificate management
  const [certCourse, setCertCourse] = useState(null); // course being managed
  const [certStudents, setCertStudents] = useState([]); // enrollment rows + status
  const [certLoading, setCertLoading] = useState(false);

  // Teacher assignment (roster-based access)
  const [teachCourse, setTeachCourse] = useState(null);
  const [teachAssigned, setTeachAssigned] = useState([]);
  const [teachCandidates, setTeachCandidates] = useState([]);
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachPick, setTeachPick] = useState("");

  // Form state
  const [form, setForm] = useState({});

  useEffect(() => { fetchCourses(); }, []);

  async function fetchCourses() {
    const { data } = await supabase.from('courses')
      .select('*, course_modules(count), course_enrollments(count)')
      .order('created_at');
    setCourses(data || []);
    setLoading(false);
  }

  async function toggleCourseFree(course) {
    const newFree = !course.is_free;
    await supabase.from('courses').update({ is_free: newFree }).eq('id', course.id);
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_free: newFree } : c));
  }

  async function toggleCourseCertificate(course) {
    const next = course.certificate_enabled === false ? true : false;
    const { error } = await supabase.from('courses').update({ certificate_enabled: next }).eq('id', course.id);
    if (error) { alert('Failed to update: ' + error.message); return; }
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, certificate_enabled: next } : c));
  }

  async function openCertManager(course) {
    setTeachCourse(null);
    setCertCourse(course);
    setCertLoading(true);
    // Enrolled students
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('user_id, profiles(full_name, email)')
      .eq('course_id', course.id);
    // Issued certificates for this course
    const { data: certs } = await supabase
      .from('certificates')
      .select('id, user_id, certificate_id, earned_at')
      .eq('course_id', course.id);
    // Blocks for this course
    const { data: blocks } = await supabase
      .from('certificate_blocks')
      .select('id, user_id, reason')
      .eq('course_id', course.id);

    const rows = (enrollments || []).map(en => ({
      user_id: en.user_id,
      name: en.profiles?.full_name || en.profiles?.email || en.user_id,
      cert: (certs || []).find(c => c.user_id === en.user_id) || null,
      block: (blocks || []).find(b => b.user_id === en.user_id) || null,
    }));
    setCertStudents(rows);
    setCertLoading(false);
  }

  async function openTeacherManager(course) {
    setCertCourse(null);
    setTeachCourse(course);
    setTeachLoading(true);
    setTeachPick("");
    // Teachers assigned to this course
    const { data: rows } = await supabase
      .from('course_teachers')
      .select('id, teacher_id, profiles(full_name, email)')
      .eq('course_id', course.id);
    const assigned = (rows || []).map(r => ({
      id: r.id,
      teacher_id: r.teacher_id,
      full_name: r.profiles?.full_name || '',
      email: r.profiles?.email || '',
    }));
    setTeachAssigned(assigned);
    // Approved teachers not yet assigned to this course
    const { data: allTeachers } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'teacher')
      .eq('status', 'approved');
    const assignedIds = new Set(assigned.map(a => a.teacher_id));
    setTeachCandidates((allTeachers || []).filter(tc => !assignedIds.has(tc.id)));
    setTeachLoading(false);
  }

  async function assignTeacher() {
    if (!teachPick || !teachCourse) return;
    await supabase.from('course_teachers').insert({
      course_id: teachCourse.id,
      teacher_id: teachPick,
      assigned_by: profile?.id || null,
    });
    openTeacherManager(teachCourse);
  }

  async function unassignTeacher(rowId) {
    if (!window.confirm('Remove this teacher from the course?')) return;
    await supabase.from('course_teachers').delete().eq('id', rowId);
    openTeacherManager(teachCourse);
  }

  async function blockStudentCertificate(userId, name) {
    const reason = window.prompt(
      `Block ${name} from the certificate for "${certCourse.title}"?\n\nEnter the message the student will see:`,
      'You are not eligible for this certificate. Please contact your instructor.'
    );
    if (reason === null) return;
    const { error } = await supabase.from('certificate_blocks').upsert({
      user_id: userId,
      course_id: certCourse.id,
      reason: reason || 'You are not eligible for this certificate.',
    });
    if (error) { alert('Failed to block: ' + error.message); return; }
    openCertManager(certCourse);
  }

  async function unblockStudentCertificate(userId) {
    if (!window.confirm('Allow this student to earn the certificate again?')) return;
    await supabase.from('certificate_blocks').delete()
      .eq('user_id', userId).eq('course_id', certCourse.id);
    openCertManager(certCourse);
  }

  async function revokeCertificate(cert) {
    if (!window.confirm(`Revoke the earned certificate (${cert.certificate_id})? The student will lose it.`)) return;
    await supabase.from('certificates').delete().eq('id', cert.id);
    openCertManager(certCourse);
  }

  async function fetchModules(courseId) {
    const { data } = await supabase.from('course_modules')
      .select('*, module_tasks(count)')
      .eq('course_id', courseId)
      .order('module_order');
    setModules(data || []);
  }

  async function fetchTasks(moduleId) {
    const { data } = await supabase.from('module_tasks')
      .select('*, tasks(*)')
      .eq('module_id', moduleId)
      .order('task_order');
    setTasks(data || []);
  }

  async function toggleModuleFree(mod) {
    setToggling(mod.id);
    const newFree = !mod.is_free;
    await supabase.from('course_modules').update({ is_free: newFree }).eq('id', mod.id);
    setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_free: newFree } : m));
    setToggling(null);
  }

  async function toggleAllFree(courseId, makeFree) {
    setToggling('all');
    await supabase.from('course_modules').update({ is_free: makeFree }).eq('course_id', courseId);
    setModules(prev => prev.map(m => ({ ...m, is_free: makeFree })));
    setToggling(null);
  }

  function openModal(type, item = null) {
    setShowModal(type);
    setEditingItem(item);
    if (type === 'course') {
      setForm(item ? { title: item.title, description: item.description || '', is_free: item.is_free } : { title: '', description: '', is_free: false });
    } else if (type === 'module') {
      setForm(item ? { title: item.title, module_type: item.module_type, description: item.description || '', module_order: item.module_order, points_value: item.points_value, is_free: item.is_free } : { title: '', module_type: 'classwork', description: '', module_order: modules.length, points_value: 100, is_free: false });
    } else if (type === 'task') {
      // Edit is opened with a module_tasks row (task data nested under .tasks)
      const t = item?.tasks || item;
      if (t && (t.title || t.prompt)) {
        setForm({ title: t.title || '', prompt: t.prompt || '', language: t.language || 'python', starter_code: t.starter_code || '', expected_output: t.expected_output || '', points_value: t.points_value ?? 10 });
      } else {
        setForm({ title: '', prompt: '', language: 'python', starter_code: '', expected_output: '', points_value: 10 });
      }
    }
  }

  function closeModal() { setShowModal(null); setEditingItem(null); setForm({}); }

  async function saveCourse() {
    if (!form.title) return;
    const data = { title: form.title, description: form.description, is_free: form.is_free || false };
    if (editingItem) {
      await supabase.from('courses').update(data).eq('id', editingItem.id);
    } else {
      await supabase.from('courses').insert(data);
    }
    closeModal(); fetchCourses();
  }

  async function saveModule() {
    if (!form.title) return;
    const data = {
      title: form.title,
      module_type: form.module_type,
      description: form.description || '',
      module_order: parseInt(form.module_order),
      points_value: parseInt(form.points_value),
      is_free: form.is_free || false,
      course_id: selectedCourse.id
    };
    if (editingItem) {
      await supabase.from('course_modules').update(data).eq('id', editingItem.id);
    } else {
      await supabase.from('course_modules').insert(data);
    }
    closeModal(); fetchModules(selectedCourse.id);
  }

  async function saveTask() {
    if (!form.title || !form.prompt) return;
    // Save the task itself
    const taskData = { title: form.title, prompt: form.prompt, language: form.language, starter_code: form.starter_code, expected_output: form.expected_output || null, points_value: parseInt(form.points_value) };
    let taskId;
    if (editingItem) {
      await supabase.from('tasks').update(taskData).eq('id', editingItem.task_id || editingItem.id);
      taskId = editingItem.task_id || editingItem.id;
    } else {
      const { data: newTask } = await supabase.from('tasks').insert(taskData).select().single();
      taskId = newTask?.id;
      // Link to module
      if (taskId) {
        await supabase.from('module_tasks').insert({ module_id: selectedModule.id, task_id: taskId, task_order: tasks.length });
      }
    }
    closeModal(); fetchTasks(selectedModule.id);
  }

  async function deleteItem(table, id, refreshFn) {
    if (!confirm('Are you sure?')) return;
    await supabase.from(table).delete().eq('id', id);
    refreshFn();
  }

  function handleSignOut() { signOut(); window.location.href = '/login'; }

  if (loading) return <div style={S.page}><div style={S.loading}>Loading...</div></div>;

  return (
    <div className="admin-page" style={S.page}>
      <nav style={S.nav}>
        <Link to="/dashboard" style={{ ...S.brand, textDecoration: 'none', color: t.txt }}>
          <span style={S.spark} /> IGNITE LAB
        </Link>
        <div style={S.navRight}>
          <span style={{ fontSize: 13, color: '#FFB238', border: '1px solid rgba(255,178,56,0.3)', padding: '4px 10px', borderRadius: 100 }}>
            {profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign out</button>
        </div>
      </nav>

      <main style={S.main}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Course Management</h1>
            <p style={{ fontSize: 14, color: t.txtDim, marginTop: 4 }}>Create and manage courses, levels, and tasks</p>
          </div>
          <button onClick={() => openModal('course')} style={S.btn}>+ New Course</button>
        </div>

        {/* Courses List */}
        {!selectedCourse && (
          <div>
            {courses.length === 0 ? (
              <div style={S.empty}>No courses yet. Click "+ New Course" to create one.</div>
            ) : (
              courses.map(course => (
                <div key={course.id} style={S.card}>
                  <div style={S.cardHeader}>
                    <div>
                      <div style={S.cardTitle}>{course.title}</div>
                      <div style={S.cardDesc}>{course.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* COURSE-LEVEL FREE/PAID TOGGLE */}
                      <button
                        onClick={() => toggleCourseFree(course)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', border: 'none',
                          background: course.is_free ? 'rgba(74,222,128,0.18)' : 'rgba(249,115,22,0.18)',
                          color: course.is_free ? t.success : t.accentLink,
                          transition: 'all 0.2s',
                        }}
                      >
                        {course.is_free ? '🆓 Free Course' : '💳 Paid Course'}
                      </button>
                      {/* CERTIFICATE ON/OFF TOGGLE */}
                      <button
                        onClick={() => toggleCourseCertificate(course)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', border: 'none',
                          background: course.certificate_enabled === false ? 'rgba(148,163,184,0.15)' : 'rgba(168,85,247,0.18)',
                          color: course.certificate_enabled === false ? '#94A3B8' : '#C084FC',
                          transition: 'all 0.2s',
                        }}
                      >
                        {course.certificate_enabled === false ? 'Certificates OFF' : 'Certificate ON'}
                      </button>
                      <button onClick={() => openCertManager(course)} style={{ ...S.btnSmall, background: 'rgba(250,204,21,0.12)', color: t.warn }}>Certs</button>
                      <button onClick={() => openTeacherManager(course)} style={{ ...S.btnSmall, background: 'rgba(34,211,238,0.12)', color: t.info }}>Teachers</button>
                      <button onClick={() => { setSelectedCourse(course); fetchModules(course.id); }} style={{ ...S.btnSmall, background: 'rgba(62,207,142,0.12)', color: '#3ECF8E' }}>Open →</button>
                      <button onClick={() => openModal('course', course)} style={{ ...S.btnSmall, background: 'rgba(56,189,248,0.12)', color: t.info }}>Edit</button>
                      <button onClick={() => deleteItem('courses', course.id, fetchCourses)} style={{ ...S.btnSmall, background: 'rgba(239,68,68,0.12)', color: t.danger }}>Delete</button>
                    </div>
                  </div>
                  <div style={S.cardMeta}>
                    <span style={S.badge}>{course.course_modules?.[0]?.count || 0} modules</span>
                    <span style={{ ...S.badgeBlue }}>👥 {course.course_enrollments?.[0]?.count || 0} enrolled</span>
                    {course.is_free && (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: 'rgba(74,222,128,0.12)', color: t.success }}>Free</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Certificate Manager */}
        {certCourse && (
          <div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <button onClick={() => setCertCourse(null)} style={S.btnGhost}>← Back to Courses</button>
                <span style={{ marginLeft: 16, fontSize: 18, fontWeight: 700, color: t.txt, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="award" size={17} /> Certificates — {certCourse.title}</span>
              </div>
              <button
                onClick={() => toggleCourseCertificate(certCourse)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: certCourse.certificate_enabled === false ? 'rgba(148,163,184,0.15)' : 'rgba(168,85,247,0.18)',
                  color: certCourse.certificate_enabled === false ? '#94A3B8' : '#C084FC',
                }}
              >
                {certCourse.certificate_enabled === false ? 'Certificates OFF' : 'Certificates ON'}
              </button>
            </div>
            <div style={{ fontSize: 13, color: t.txtDim, marginBottom: 16 }}>
              When certificates are ON, every student who completes all tasks automatically earns the certificate.
              Blocking a student prevents their certificate and shows them your message instead.
            </div>
            {certLoading ? (
              <div style={S.loading}>Loading students...</div>
            ) : certStudents.length === 0 ? (
              <div style={S.empty}>No students enrolled in this course yet.</div>
            ) : (
              certStudents.map(st => (
                <div key={st.user_id} style={{ ...S.card, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: t.txt }}>{st.name}</div>
                      <div style={{ fontSize: 12, color: t.txtDim, marginTop: 2 }}>
                        {st.cert ? `Certificate earned ${new Date(st.cert.earned_at).toLocaleDateString()} (${st.cert.certificate_id})`
                          : st.block ? `Blocked — "${st.block.reason}"`
                          : '⏳ Course not completed yet'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {st.block ? (
                        <button onClick={() => unblockStudentCertificate(st.user_id)} style={{ ...S.btnSmall, background: 'rgba(74,222,128,0.12)', color: t.success }}>Unblock</button>
                      ) : (
                        <button onClick={() => blockStudentCertificate(st.user_id, st.name)} style={{ ...S.btnSmall, background: 'rgba(239,68,68,0.12)', color: t.danger }}>Block</button>
                      )}
                      {st.cert && (
                        <button onClick={() => revokeCertificate(st.cert)} style={{ ...S.btnSmall, background: 'rgba(250,204,21,0.12)', color: '#FACC15' }}>Revoke</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Teacher Assignment (roster-based access) */}
        {teachCourse && (
          <div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <button onClick={() => setTeachCourse(null)} style={S.btnGhost}>← Back to Courses</button>
                <span style={{ marginLeft: 16, fontSize: 18, fontWeight: 700, color: t.txt, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="users" size={17} /> Teachers — {teachCourse.title}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: t.txtDim, marginBottom: 16 }}>
              Assigned teachers only see the submissions, points, and progress of students in
              this course. Admins always keep full access.
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={teachPick}
                onChange={e => setTeachPick(e.target.value)}
                style={{ background: t.card, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: t.txt, minWidth: 240 }}
              >
                <option value="">{teachCandidates.length ? 'Select a teacher…' : 'No more teachers available'}</option>
                {teachCandidates.map(tc => (
                  <option key={tc.id} value={tc.id}>{tc.full_name || tc.email}</option>
                ))}
              </select>
              <button
                onClick={assignTeacher}
                disabled={!teachPick}
                style={{ ...S.btnSmall, background: 'rgba(34,211,238,0.15)', color: '#22D3EE', opacity: teachPick ? 1 : 0.5, padding: '9px 18px' }}
              >
                + Assign
              </button>
            </div>
            {teachLoading ? (
              <div style={S.loading}>Loading teachers...</div>
            ) : teachAssigned.length === 0 ? (
              <div style={S.empty}>No teachers assigned yet. A teacher can only see this course's students after being assigned here.</div>
            ) : (
              teachAssigned.map(row => (
                <div key={row.id} style={{ ...S.card, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: t.txt }}>{row.full_name || 'Teacher'}</div>
                      <div style={{ fontSize: 12, color: t.txtDim, marginTop: 2 }}>{row.email}</div>
                    </div>
                    <button onClick={() => unassignTeacher(row.id)} style={{ ...S.btnSmall, background: 'rgba(239,68,68,0.12)', color: t.danger }}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modules within Course */}
        {selectedCourse && !selectedModule && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setSelectedCourse(null); setModules([]); }} style={S.btnGhost}>← Back to Courses</button>
              <span style={{ marginLeft: 16, fontSize: 18, fontWeight: 700, color: t.txt }}>{selectedCourse.title}</span>
            </div>

            {/* Free/Paid bulk controls */}
            {modules.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: t.txtDim }}>Quick Actions:</span>
                <button
                  onClick={() => toggleAllFree(selectedCourse.id, true)}
                  disabled={toggling === 'all'}
                  style={{ ...S.btnSmall, background: 'rgba(74,222,128,0.12)', color: t.success, fontSize: 12, padding: '6px 14px', opacity: toggling === 'all' ? 0.5 : 1 }}
                >
                  🆓 Make All Free
                </button>
                <button
                  onClick={() => toggleAllFree(selectedCourse.id, false)}
                  disabled={toggling === 'all'}
                  style={{ ...S.btnSmall, background: 'rgba(249,115,22,0.12)', color: t.accentLink, fontSize: 12, padding: '6px 14px', opacity: toggling === 'all' ? 0.5 : 1 }}
                >
                  Lock All (Paid)
                </button>
                <span style={{ fontSize: 12, color: t.txtDim }}>
                  {modules.filter(m => m.is_free).length} free / {modules.filter(m => !m.is_free).length} paid
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => openModal('module')} style={S.btn}>+ New Module</button>
            </div>
            {modules.length === 0 ? (
              <div style={S.empty}>No modules yet. Click "+ New Module" to add one.</div>
            ) : (
              modules.map(mod => (
                <div key={mod.id} style={{ ...S.card, borderColor: mod.is_free ? 'rgba(74,222,128,0.2)' : 'rgba(249,115,22,0.15)' }}>
                  <div style={S.cardHeader}>
                    <div>
                      <div style={S.cardTitle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={MODULE_ICONS[mod.module_type] || 'book'} size={15} /> {mod.title}</span>
                      </div>
                      <div style={S.cardMeta}>
                        <span style={S.badge}>{mod.module_type}</span>
                        <span style={S.badgeBlue}>+{mod.points_value} pts</span>
                        <span style={{ fontSize: 12, color: t.txtDim }}>Order: {mod.module_order}</span>
                        <span style={{ fontSize: 12, color: t.txtDim }}>{mod.module_tasks?.[0]?.count || 0} tasks</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* FREE / PAID TOGGLE */}
                      <button
                        onClick={() => toggleModuleFree(mod)}
                        disabled={toggling === mod.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: toggling === mod.id ? 'wait' : 'pointer',
                          border: 'none',
                          background: mod.is_free ? 'rgba(74,222,128,0.18)' : 'rgba(249,115,22,0.18)',
                          color: mod.is_free ? t.success : t.accentLink,
                          transition: 'all 0.2s',
                          opacity: toggling === mod.id ? 0.6 : 1,
                        }}
                      >
                        {mod.is_free ? '🆓 Free' : '💳 Paid'}
                      </button>
                      <button onClick={() => { setSelectedModule(mod); fetchTasks(mod.id); }} style={{ ...S.btnSmall, background: 'rgba(62,207,142,0.12)', color: '#3ECF8E' }}>Tasks →</button>
                      <button onClick={() => openModal('module', mod)} style={{ ...S.btnSmall, background: 'rgba(56,189,248,0.12)', color: t.info }}>Edit</button>
                      <button onClick={() => deleteItem('course_modules', mod.id, () => fetchModules(selectedCourse.id))} style={{ ...S.btnSmall, background: 'rgba(239,68,68,0.12)', color: t.danger }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tasks within Module */}
        {selectedModule && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setSelectedModule(null); setTasks([]); }} style={S.btnGhost}>← Back to Modules</button>
              <span style={{ marginLeft: 16, fontSize: 18, fontWeight: 700, color: t.txt, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name={MODULE_ICONS[selectedModule.module_type] || 'book'} size={17} /> {selectedModule.title}
              </span>
              <span style={{ marginLeft: 12, fontSize: 12, padding: '4px 10px', borderRadius: 100, background: selectedModule.is_free ? 'rgba(74,222,128,0.18)' : 'rgba(249,115,22,0.18)', color: selectedModule.is_free ? t.success : t.accentLink, fontWeight: 700 }}>
                {selectedModule.is_free ? '🆓 Free' : '💳 Paid'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => openModal('task')} style={S.btn}>+ New Task</button>
            </div>
            {tasks.length === 0 ? (
              <div style={S.empty}>No tasks yet. Click "+ New Task" to add one.</div>
            ) : (
              tasks.map(mt => (
                <div key={mt.id} style={S.card}>
                  <div style={S.cardHeader}>
                    <div>
                      <div style={S.cardTitle}>{mt.tasks?.title || 'Untitled Task'}</div>
                      <div style={S.cardMeta}>
                        <span style={S.badge}>{mt.tasks?.language || '?'}</span>
                        <span style={S.badgeBlue}>+{mt.tasks?.points_value || 0} pts</span>
                        <span style={{ fontSize: 12, color: t.txtDim }}>Order: {mt.task_order}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openModal('task', mt)} style={{ ...S.btnSmall, background: 'rgba(56,189,248,0.12)', color: t.info }}>Edit</button>
                      <button onClick={() => deleteItem('module_tasks', mt.id, () => fetchTasks(selectedModule.id))} style={{ ...S.btnSmall, background: 'rgba(239,68,68,0.12)', color: t.danger }}>Delete</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: t.txtDim, marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{(mt.tasks?.prompt || '').slice(0, 200)}{(mt.tasks?.prompt || '').length > 200 ? '...' : ''}</div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Course Modal */}
      {showModal === 'course' && (
        <div style={S.modalOverlay} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editingItem ? 'Edit Course' : 'New Course'}</h2>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Python Fundamentals" />
            <label style={S.label}>Description</label>
            <textarea style={S.textarea} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will students learn?" />
            <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_free || false} onChange={e => setForm({ ...form, is_free: e.target.checked })} />
              🆓 Entire course free for all students (marketing / full session)
            </label>
            <div style={S.modalActions}>
              <button onClick={closeModal} style={S.btnGhost}>Cancel</button>
              <button onClick={saveCourse} style={S.btn}>{editingItem ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {showModal === 'module' && (
        <div style={S.modalOverlay} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editingItem ? 'Edit Module' : 'New Module'}</h2>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Hello World" />
            <label style={S.label}>Type</label>
            <select style={S.select} value={form.module_type || 'classwork'} onChange={e => setForm({ ...form, module_type: e.target.value })}>
              {MODULE_TYPES.map(ty => <option key={ty} value={ty}>{ty}</option>)}
            </select>
            <label style={S.label}>Description</label>
            <textarea style={S.textarea} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this module cover?" />
            <label style={S.label}>Module Order</label>
            <input style={S.input} type="number" value={form.module_order ?? ''} onChange={e => setForm({ ...form, module_order: e.target.value })} />
            <label style={S.label}>Points Value</label>
            <input style={S.input} type="number" value={form.points_value || ''} onChange={e => setForm({ ...form, points_value: e.target.value })} />
            <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_free || false} onChange={e => setForm({ ...form, is_free: e.target.checked })} />
              🆓 Free for all students (no subscription required)
            </label>
            <div style={S.modalActions}>
              <button onClick={closeModal} style={S.btnGhost}>Cancel</button>
              <button onClick={saveModule} style={S.btn}>{editingItem ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showModal === 'task' && (
        <div style={S.modalOverlay} onClick={closeModal}>
          <div style={{ ...S.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>{editingItem ? 'Edit Task' : 'New Task'}</h2>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Print Hello World" />
            <label style={S.label}>Language</label>
            <select style={S.select} value={form.language || 'python'} onChange={e => setForm({ ...form, language: e.target.value })}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <label style={S.label}>Prompt (instructions for student)</label>
            <textarea style={{ ...S.textarea, minHeight: 100 }} value={form.prompt || ''} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="What should the student build?" />
            <label style={S.label}>Starter Code</label>
            <textarea style={{ ...S.textarea, minHeight: 100, fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }} value={form.starter_code || ''} onChange={e => setForm({ ...form, starter_code: e.target.value })} placeholder="# Write starter code here" />
            <label style={S.label}>Expected Output (for auto-grading, optional)</label>
            <input style={S.input} value={form.expected_output || ''} onChange={e => setForm({ ...form, expected_output: e.target.value })} placeholder="e.g. Hello, World!" />
            <label style={S.label}>Points</label>
            <input style={S.input} type="number" value={form.points_value || ''} onChange={e => setForm({ ...form, points_value: e.target.value })} />
            <div style={S.modalActions}>
              <button onClick={closeModal} style={S.btnGhost}>Cancel</button>
              <button onClick={saveTask} style={S.btn}>{editingItem ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-page nav { padding: 12px 16px !important; }
          .admin-page main { padding: 20px 16px !important; }
          .admin-page .grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
