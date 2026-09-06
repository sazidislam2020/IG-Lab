import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ courses: [], tasks: [], students: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const { colors: t } = useTheme();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery("");
      setResults({ courses: [], tasks: [], students: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ courses: [], tasks: [], students: [] });
      return;
    }

    const debounce = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  async function search(q) {
    setLoading(true);
    const searchTerm = `%${q}%`;

    // Search courses
    const { data: courses } = await supabase
      .from("courses")
      .select("id, title, description")
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5);

    // Search tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, language, levels!inner(title, courses!inner(id, title))")
      .or(`title.ilike.${searchTerm}`)
      .limit(5);

    // Search students (admin only)
    let students = [];
    if (isAdmin || isSuperAdmin) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(5);
      students = data || [];
    }

    setResults({
      courses: courses || [],
      tasks: tasks || [],
      students,
    });
    setLoading(false);
  }

  function handleSelect(type, item) {
    onClose();
    if (type === "course") navigate(`/courses/${item.id}`);
    if (type === "task") navigate(`/tasks/${item.id}`);
    if (type === "student") navigate(`/admin/approvals`);
  }

  if (!isOpen) return null;

  const hasResults =
    results.courses.length > 0 ||
    results.tasks.length > 0 ||
    results.students.length > 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, tasks, students..."
            style={styles.input}
          />
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Results */}
        <div style={styles.results}>
          {loading && (
            <div style={styles.loading}>Searching...</div>
          )}

          {!loading && query.length < 2 && (
            <div style={styles.hint}>Type at least 2 characters to search</div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div style={styles.hint}>No results found for "{query}"</div>
          )}

          {/* Courses */}
          {results.courses.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📚 Courses</div>
              {results.courses.map((course) => (
                <div
                  key={course.id}
                  style={styles.resultItem}
                  onClick={() => handleSelect("course", course)}
                >
                  <div style={styles.resultTitle}>{course.title}</div>
                  <div style={styles.resultDesc}>{course.description?.slice(0, 60)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📝 Tasks</div>
              {results.tasks.map((task) => (
                <div
                  key={task.id}
                  style={styles.resultItem}
                  onClick={() => handleSelect("task", task)}
                >
                  <div style={styles.resultTitle}>{task.title}</div>
                  <div style={styles.resultDesc}>
                    {task.language} · {task.levels?.courses?.title}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Students (admin only) */}
          {results.students.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>👥 Students</div>
              {results.students.map((student) => (
                <div
                  key={student.id}
                  style={styles.resultItem}
                  onClick={() => handleSelect("student", student)}
                >
                  <div style={styles.resultTitle}>{student.full_name || student.email}</div>
                  <div style={styles.resultDesc}>{student.role} · {student.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.shortcut}>ESC</span> to close
          <span style={{ margin: "0 8px" }}>·</span>
          <span style={styles.shortcut}>↑↓</span> to navigate
          <span style={{ margin: "0 8px" }}>·</span>
          <span style={styles.shortcut}>↵</span> to select
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "15vh",
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    background: "#131926",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  searchIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#fff",
    fontFamily: "'Inter',sans-serif",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "none",
    color: "#888",
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  results: {
    maxHeight: 400,
    overflow: "auto",
  },
  loading: {
    padding: 24,
    textAlign: "center",
    color: "#888",
    fontSize: 14,
  },
  hint: {
    padding: 24,
    textAlign: "center",
    color: "#5C6478",
    fontSize: 14,
  },
  section: {
    padding: "8px 0",
  },
  sectionTitle: {
    padding: "8px 20px",
    fontSize: 11,
    fontWeight: 600,
    color: "#5C6478",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  resultItem: {
    padding: "12px 20px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 2,
  },
  resultDesc: {
    fontSize: 12,
    color: "#888",
  },
  footer: {
    padding: "12px 20px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    fontSize: 12,
    color: "#5C6478",
    textAlign: "center",
  },
  shortcut: {
    background: "rgba(255,255,255,0.06)",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "monospace",
  },
};
