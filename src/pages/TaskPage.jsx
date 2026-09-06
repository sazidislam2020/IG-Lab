import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { supabase } from '../lib/supabase';
import { executeCode } from '../lib/runCode';
import { useAuth } from '../contexts/AuthContext';

const S = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter',sans-serif", overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#131926', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backLink: { color: '#888', textDecoration: 'none', fontSize: 13 },
  title: { fontSize: 16, fontWeight: 600 },
  runBtn: { background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  submitBtn: { background: '#3ECF8E', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginLeft: 8 },
  split: { flex: 1, display: 'flex', overflow: 'hidden' },
  leftPanel: { flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)' },
  rightPanel: { width: '40%', display: 'flex', flexDirection: 'column', background: '#0F1420' },
  panelLabel: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: '#5C6478', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' },
  panelDot: { width: 6, height: 6, borderRadius: '50%', display: 'inline-block' },
  taskPrompt: { padding: 20, fontSize: 14, lineHeight: 1.7, color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'auto', maxHeight: 200, background: '#131926' },
  promptTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 },
  promptText: { color: '#aaa', lineHeight: 1.6 },
  output: { flex: 1, overflow: 'auto', padding: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, lineHeight: 1.7 },
  outputPlaceholder: { color: '#5C6478', textAlign: 'center', marginTop: 60, fontSize: 14 },
  outputLine: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  passed: { background: 'rgba(62,207,142,0.12)', color: '#3ECF8E', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, marginBottom: 12 },
  failed: { background: 'rgba(248,113,113,0.12)', color: '#F87171', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, marginBottom: 12 },
  tabs: { display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  tab: { padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#5C6478', background: 'transparent', border: 'none', borderBottom: '2px solid transparent' },
  tabActive: { color: '#f97316', borderBottom: '2px solid #f97316' },
  tabSubmissions: { padding: 16, fontSize: 13, color: '#888' },
  submissionRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  submissionStatus: { fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
};

export default function TaskPage() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [level, setLevel] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [rightTab, setRightTab] = useState('output');
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    async function fetchTask() {
      const { data } = await supabase
        .from('tasks')
        .select('*, levels(*, courses(*))')
        .eq('id', taskId)
        .single();
      if (data) {
        setTask(data);
        setLevel(data.levels);
        setCode(data.starter_code || '');
      }
    }
    async function fetchSubmissions() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setSubmissions(data || []);
      // One-attempt policy: the single submission for this task+student
      setExistingSubmission(data?.[0] || null);
    }
    fetchTask();
    fetchSubmissions();
  }, [taskId, user?.id]);

  async function runCode() {
    setIsRunning(true);
    setOutput([]);
    setRightTab('output');

    if (task?.language === 'javascript') {
      try {
        const logs = [];
        const fakeConsole = {
          log: (...args) => logs.push(args.map(a => String(a)).join(' ')),
          error: (...args) => logs.push('ERROR: ' + args.map(a => String(a)).join(' ')),
        };
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('console', code);
        await fn(fakeConsole);
        setOutput(logs.length > 0 ? logs : ['(no output)']);
      } catch (err) {
        setOutput(['Error: ' + err.message]);
      }
    } else {
      try {
        const result = await executeCode({ language: task.language, code });
        const lines = [];
        if (result.status_id && result.status_id !== 3) lines.push('❌ ' + result.status);
        if (result.compile_output) lines.push('📝 ' + result.compile_output);
        if (result.stdout) lines.push(...result.stdout.split('\n'));
        if (result.stderr) lines.push('⚠️ ' + result.stderr);
        if (result.time) lines.push('');
        if (result.time) lines.push(`⏱ ${result.time}s | ${result.memory || 0} KB`);
        if (lines.length === 0) lines.push('(no output)');
        setOutput(lines);
      } catch (err) {
        setOutput(['❌ ' + err.message]);
      }
    }
    setIsRunning(false);
  }

  async function submitCode() {
    if (!user) return;
    // One-attempt policy: only one submission per task per student
    if (existingSubmission) {
      setRightTab('output');
      setOutput(['🔒 You have already submitted this task. One attempt only.']);
      return;
    }
    setIsRunning(true);
    setRightTab('output');

    // Run the code first
    let outputText = '';
    if (task?.language === 'javascript') {
      try {
        const logs = [];
        const fakeConsole = {
          log: (...args) => logs.push(args.map(a => String(a)).join(' ')),
          error: (...args) => logs.push('ERROR: ' + args.map(a => String(a)).join(' ')),
        };
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('console', code);
        await fn(fakeConsole);
        outputText = logs.join('\n');
        setOutput(logs.length > 0 ? logs : ['(no output)']);
      } catch (err) {
        outputText = 'Error: ' + err.message;
        setOutput([outputText]);
      }
    } else {
      try {
        const result = await executeCode({ language: task.language, code });
        outputText = result.stdout || result.compile_output || '';
        const lines = [];
        if (result.status_id && result.status_id !== 3) lines.push('❌ ' + result.status);
        if (result.compile_output) lines.push('📝 ' + result.compile_output);
        if (result.stdout) lines.push(...result.stdout.split('\n'));
        if (result.stderr) lines.push('⚠️ ' + result.stderr);
        setOutput(lines.length > 0 ? lines : ['(no output)']);
      } catch (err) {
        outputText = '❌ ' + err.message;
        setOutput([outputText]);
      }
    }

    // Check if passed
    const passed = task.expected_output
      ? outputText.trim().includes(task.expected_output.trim())
      : outputText.length > 0 && !outputText.startsWith('Error') && !outputText.startsWith('❌');

    // Save submission (unique task_id + user_id — second attempt fails here)
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        task_id: taskId,
        code,
        language: task.language,
        output: outputText,
        passed,
        points_awarded: passed ? task.points_value : 0,
        graded_by: 'auto',
      })
      .select()
      .single();

    if (subErr) {
      setIsRunning(false);
      setRightTab('output');
      setOutput(['🔒 ' + (subErr.message || 'Submission was not saved. One attempt only.')]);
      return;
    }

    // Lock further attempts immediately
    setExistingSubmission(sub);

    // Award points if passed
    if (passed && sub) {
      await supabase.from('points_ledger').insert({
        user_id: user.id,
        submission_id: sub.id,
        points: task.points_value,
        reason: 'task_passed',
      });
    }

    setSubmitResult(passed ? 'passed' : 'failed');
    setRightTab('output');

    // Refresh submissions
    const { data: freshSubs } = await supabase
      .from('submissions')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSubmissions(freshSubs || []);

    setIsRunning(false);
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <Link to={level?.courses?.id ? `/courses/${level.courses.id}` : '/courses'} style={S.backLink}>← Back to Course</Link>
          <span style={S.title}>{task?.title || 'Loading...'}</span>
          {task?.is_boss || level?.is_boss ? (
            <span style={{ fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' }}>⚔️ Boss</span>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runCode} disabled={isRunning} style={S.runBtn}>
            {isRunning ? 'Running...' : '▶ Run'}
          </button>
          <button onClick={submitCode} disabled={isRunning || !!existingSubmission} style={{ ...S.submitBtn, opacity: existingSubmission ? 0.5 : 1, cursor: existingSubmission ? 'not-allowed' : 'pointer' }}>
            {existingSubmission ? '🔒 Submitted' : '📤 Submit'}
          </button>
        </div>
      </div>

      {/* Split view */}
      <div style={S.split}>
        {/* Left: Task prompt + Editor */}
        <div style={S.leftPanel}>
          <div style={S.taskPrompt}>
            <div style={S.promptTitle}>{task?.title}</div>
            <div style={S.promptText}>{task?.prompt}</div>
            {task?.expected_output && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(62,207,142,0.08)', borderRadius: 6, fontSize: 12, color: '#3ECF8E' }}>
                <strong>Expected output:</strong> <code>{task.expected_output}</code>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              Language: <strong>{task?.language}</strong> · Points: <strong>{task?.points_value}</strong>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={task?.language === 'cpp' ? 'cpp' : task?.language || 'python'}
              value={code}
              onChange={val => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Right: Output + Submissions */}
        <div style={S.rightPanel}>
          <div style={S.tabs}>
            <button
              style={rightTab === 'output' ? { ...S.tab, ...S.tabActive } : S.tab}
              onClick={() => setRightTab('output')}
            >
              Output
            </button>
            <button
              style={rightTab === 'submissions' ? { ...S.tab, ...S.tabActive } : S.tab}
              onClick={() => setRightTab('submissions')}
            >
              Submissions ({submissions.length})
            </button>
          </div>

          {rightTab === 'output' ? (
            <div style={S.output}>
              {/* One-attempt status banner (persisted submission) */}
              {existingSubmission && !submitResult && (
                existingSubmission.passed ? (
                  <div style={S.passed}>
                    ✅ Passed! +{existingSubmission.points_awarded} points awarded
                    {existingSubmission.graded_by === 'manual'
                      ? <span style={{ opacity: 0.75 }}> — manually reviewed by teacher</span>
                      : <span style={{ opacity: 0.75 }}> — auto-graded</span>}
                  </div>
                ) : (
                  <div style={S.failed}>
                    ❌ Not passed. You have used your one attempt for this task{existingSubmission.graded_by === 'manual' ? ' (teacher review)' : ''}.
                  </div>
                )
              )}
              {submitResult === 'passed' && (
                <div style={S.passed}>✅ Passed! +{task?.points_value} points awarded</div>
              )}
              {submitResult === 'failed' && (
                <div style={S.failed}>❌ Not passed. You have used your one attempt for this task.</div>
              )}
              {output.length === 0 ? (
                <div style={S.outputPlaceholder}>Click <strong>▶ Run</strong> or <strong>📤 Submit</strong></div>
              ) : (
                output.map((line, i) => (
                  <div key={i} style={{
                    ...S.outputLine,
                    color: line.startsWith('Error') || line.startsWith('❌') ? '#F87171' :
                           line.startsWith('⚠') ? '#FFB238' : '#EDEFF3'
                  }}>{line}</div>
                ))
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {submissions.length === 0 ? (
                <div style={{ color: '#5C6478', textAlign: 'center', marginTop: 40 }}>No submissions yet</div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: '#5C6478', marginBottom: 12 }}>One submission per task — the result below is final unless a teacher reviews it.</div>
              {
                submissions.map(sub => (
                  <div key={sub.id} style={S.submissionRow}>
                    <span style={{
                      ...S.submissionStatus,
                      background: sub.passed ? 'rgba(62,207,142,0.12)' : 'rgba(248,113,113,0.12)',
                      color: sub.passed ? '#3ECF8E' : '#F87171',
                    }}>
                      {sub.passed ? '✅ Pass' : '❌ Fail'}
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {new Date(sub.created_at).toLocaleString()}
                    </span>
                    {sub.passed && (
                      <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>+{sub.points_awarded}</span>
                    )}
                  </div>
                ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
