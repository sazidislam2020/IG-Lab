import { useState } from "react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", monaco: "javascript" },
  { id: "python", label: "Python", monaco: "python" },
  { id: "html", label: "HTML", monaco: "html" },
  { id: "css", label: "CSS", monaco: "css" },
  { id: "java", label: "Java", monaco: "java" },
  { id: "c", label: "C", monaco: "c" },
  { id: "cpp", label: "C++", monaco: "cpp" },
];

const STARTER_CODE = {
  javascript: `// Welcome to Ignite Lab!\n// Write your code here and click Run\n\nfunction greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("World"));\nconsole.log("2 + 2 =", 2 + 2);\n\n// Try: loop, array, function\nfor (let i = 1; i <= 5; i++) {\n  console.log("Level " + i + " unlocked!");\n}`,
  python: `# Welcome to Ignite Lab!\n# Write your code here and click Run\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\nprint(f"2 + 2 = {2 + 2}")\n\n# Try: loop, list, function\nfor i in range(1, 6):\n    print(f"Level {i} unlocked!")`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <title>My First Page</title>\n  <style>\n    body { font-family: sans-serif; background: #0A0E16; color: white; padding: 20px; }\n    h1 { color: #FF5A1F; }\n  </style>\n</head>\n<body>\n  <h1>Hello from Ignite Lab!</h1>\n  <p>Edit this HTML and see the preview update live.</p>\n</body>\n</html>`,
  css: `/* Welcome to Ignite Lab CSS Playground */\nbody {\n  background: #0A0E16;\n  color: #EDEFF3;\n  font-family: 'Inter', sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n}\n\n.card {\n  background: #131926;\n  border: 1px solid rgba(237,239,243,0.09);\n  border-radius: 12px;\n  padding: 32px;\n  text-align: center;\n}\n\nh1 { color: #FF5A1F; }`,
  java: `// Welcome to Ignite Lab!\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        System.out.println("2 + 2 = " + (2 + 2));\n        \n        // Try: loop, array\n        for (int i = 1; i <= 5; i++) {\n            System.out.println("Level " + i + " unlocked!");\n        }\n    }\n}`,
  c: `// Welcome to Ignite Lab!\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    printf("2 + 2 = %d\\n", 2 + 2);\n    \n    // Try: loop, array\n    for (int i = 1; i <= 5; i++) {\n        printf("Level %d unlocked!\\n", i);\n    }\n    return 0;\n}`,
  cpp: `// Welcome to Ignite Lab!\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    cout << "2 + 2 = " << 2 + 2 << endl;\n    \n    // Try: loop, vector\n    for (int i = 1; i <= 5; i++) {\n        cout << "Level " << i << " unlocked!" << endl;\n    }\n    return 0;\n}`,
};

const CLIENT_LANGS = ["javascript", "html", "css"];

export default function CodeSandbox() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_CODE.javascript);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  function handleLanguageChange(langId) {
    setLanguage(langId);
    setCode(STARTER_CODE[langId] || "");
    setOutput([]);
  }

  async function runCode() {
    setIsRunning(true);
    setOutput([]);

    // Client-side languages
    if (language === "javascript") {
      try {
        const logs = [];
        const fakeConsole = {
          log: (...args) => logs.push(args.map(a => String(a)).join(" ")),
          error: (...args) => logs.push("ERROR: " + args.map(a => String(a)).join(" ")),
          warn: (...args) => logs.push("WARN: " + args.map(a => String(a)).join(" ")),
        };
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction("console", code);
        await fn(fakeConsole);
        setOutput(logs.length > 0 ? logs : ["(no output)"]);
        setIsRunning(false);
      } catch (err) {
        setOutput(["Error: " + err.message]);
        setIsRunning(false);
      }
      return;
    }

    if (language === "html") {
      setOutput(["HTML preview is available in the Preview panel."]);
      setIsRunning(false);
      return;
    }

    if (language === "css") {
      setOutput(["CSS preview is available in the Preview panel."]);
      setIsRunning(false);
      return;
    }

    // Server-side languages: call Judge0 CE API
    const JUDGE0_API = "https://ce.judge0.com";
    const langMap = {
      python: 100,   // Python 3.12.5
      java: 91,      // Java JDK 17.0.6
      c: 103,        // C (GCC 14.1.0)
      cpp: 105,      // C++ (GCC 14.1.0)
    };
    const language_id = langMap[language];

    try {
      // Submit code and wait for result
      const resp = await fetch(
        `${JUDGE0_API}/submissions?base64_encoded=false&wait=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language_id, source_code: code }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        setOutput(["❌ Judge0 error (HTTP " + resp.status + "):", errText]);
        setIsRunning(false);
        return;
      }

      const result = await resp.json();
      const lines = [];

      if (result.status?.description) {
        const statusIcon = result.status.id === 3 ? "✅" : "❌";
        lines.push(statusIcon + " " + result.status.description);
        lines.push("");
      }
      if (result.compile_output) {
        lines.push("📝 Compile output:");
        lines.push(result.compile_output);
        lines.push("");
      }
      if (result.stdout) {
        lines.push(...result.stdout.split("\n"));
      }
      if (result.stderr) {
        lines.push("⚠️ stderr:");
        lines.push(result.stderr);
      }
      if (result.time) {
        lines.push("");
        lines.push("⏱ Time: " + result.time + "s | Memory: " + result.memory + " KB");
      }
      if (lines.length === 0) {
        lines.push("(no output)");
      }
      setOutput(lines);
    } catch (err) {
      setOutput([
        "❌ Connection failed: " + err.message,
        "",
        "Could not reach the Judge0 API.",
        "Check your internet connection and try again.",
      ]);
    }
    setIsRunning(false);
  }

  return (
    <div className="code-sandbox-page" style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <Link to="/dashboard" style={S.backLink}>← Dashboard</Link>
          <span style={S.title}>Code Sandbox</span>
        </div>
        <div style={S.headerRight}>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={S.select}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <button onClick={runCode} disabled={isRunning} style={S.runBtn}>
            {isRunning ? "Running..." : "▶ Run"}
          </button>
        </div>
      </div>

      {/* Editor + Output split */}
      <div style={S.split}>
        {/* Editor */}
        <div style={S.editorWrap}>
          <div style={S.panelLabel}>
            <span style={S.panelDot} /> EDITOR — {LANGUAGES.find(l => l.id === language)?.label}
          </div>
          <div style={S.editor}>
            <Editor
              height="100%"
              language={LANGUAGES.find(l => l.id === language)?.monaco || "javascript"}
              value={code}
              onChange={(val) => setCode(val || "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                lineNumbers: "on",
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Output */}
        <div style={S.outputWrap}>
          <div style={S.panelLabel}>
            <span style={{...S.panelDot, background: output.length > 0 ? "#3ECF8E" : "#5C6478"}} /> OUTPUT
          </div>
          <div style={S.output}>
            {output.length === 0 ? (
              <div style={S.outputPlaceholder}>
                Click <strong>▶ Run</strong> to execute your code
              </div>
            ) : (
              output.map((line, i) => (
                <div key={i} style={{
                  ...S.outputLine,
                  color: line.startsWith("❌") || line.startsWith("Error") ? "#F87171" :
                         line.startsWith("⚠") || line.startsWith("WARN") ? "#FFB238" :
                         line.startsWith("📝") || line.startsWith("Note:") ? "#8A93A6" : "#EDEFF3"
                }}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .code-sandbox-page .split { flex-direction: column !important; }
          .code-sandbox-page .editorWrap { border-right: none !important; border-bottom: 1px solid rgba(237,239,243,0.09) !important; min-height: 40vh; }
          .code-sandbox-page .outputWrap { width: 100% !important; min-height: 30vh; }
          .code-sandbox-page header { flex-wrap: wrap; gap: 8px; padding: 10px 16px !important; }
          .code-sandbox-page header > div:last-child { gap: 8px; }
        }
      `}</style>
    </div>
  );
}

const BG="#0A0E16",BG2="#0F1420",PANEL="#131926",LINE="rgba(237,239,243,0.09)",LINE2="rgba(237,239,243,0.16)";
const TXT="#EDEFF3",DIM="#8A93A6",FAINT="#5C6478",ORG="#FF5A1F",GRN="#3ECF8E";

const S = {
  page: {height:"100vh",display:"flex",flexDirection:"column",background:BG,color:TXT,fontFamily:"Inter,sans-serif",overflow:"hidden"},
  header: {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:PANEL,borderBottom:"1px solid "+LINE},
  headerLeft: {display:"flex",alignItems:"center",gap:16},
  headerRight: {display:"flex",alignItems:"center",gap:12},
  backLink: {color:DIM,fontSize:13,textDecoration:"none"},
  title: {fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:600},
  select: {background:BG2,border:"1px solid "+LINE2,borderRadius:6,padding:"7px 12px",fontSize:13,color:TXT,cursor:"pointer"},
  runBtn: {background:"linear-gradient(135deg,#f97316,#ef4444)",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:"pointer",transition:"transform 0.15s"},
  split: {flex:1,display:"flex",overflow:"hidden"},
  editorWrap: {flex:1,display:"flex",flexDirection:"column",borderRight:"1px solid "+LINE},
  editor: {flex:1,overflow:"hidden"},
  outputWrap: {width:"40%",display:"flex",flexDirection:"column",background:BG2},
  panelLabel: {display:"flex",alignItems:"center",gap:8,padding:"8px 16px",fontSize:11,fontWeight:600,letterSpacing:1.2,color:FAINT,borderBottom:"1px solid "+LINE,textTransform:"uppercase"},
  panelDot: {width:6,height:6,borderRadius:"50%",background:ORG,display:"inline-block"},
  output: {flex:1,overflow:"auto",padding:16,fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:1.7},
  outputPlaceholder: {color:FAINT,textAlign:"center",marginTop:60,fontSize:14},
  outputLine: {whiteSpace:"pre-wrap",wordBreak:"break-all"},
};

// Responsive styles injected via <style> tag
