import { supabase } from "./supabase";

/**
 * executeCode — runs code in a sandbox.
 *
 * Strategy:
 *  1. Try the Supabase Edge Function "execute-code" (Piston proxy).
 *     This is used when the operator has deployed the function (see
 *     DEPLOY_PISTON.md). If it's not deployed, the call throws and we fall through.
 *  2. Fall back to the public Judge0 CE API, which works with no setup
 *     (CORS is open). Language ids: python 100, java 91, c 103, cpp 105.
 *
 * Returns: { stdout, stderr, compile_output, status, status_id, time, memory, source }
 */
const JUDGE0_API = "https://ce.judge0.com";

const JUDGE0_LANG_MAP = {
  python: 100, // Python 3.12.5
  java: 91,    // Java JDK 17.0.6
  c: 103,      // C (GCC 14.1.0)
  cpp: 105,    // C++ (GCC 14.1.0)
};

export async function executeCode({ language, code }) {
  // 1. Try the Supabase Edge Function (Piston proxy) if it's deployed
  try {
    const { data, error } = await supabase.functions.invoke("execute-code", {
      body: { language, code },
    });
    if (!error && data && !data.error) {
      return {
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        compile_output: data.compile_output || "",
        status: data.status || "Accepted",
        status_id: 3,
        time: data.time,
        memory: data.memory,
        source: "piston",
      };
    }
  } catch {
    // Edge function not deployed — fall through to Judge0
  }

  // 2. Fall back to the public Judge0 CE API
  const language_id = JUDGE0_LANG_MAP[language];
  if (!language_id) {
    throw new Error(`Language "${language}" is not supported by the code runner yet.`);
  }

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
    throw new Error(`Code runner error (HTTP ${resp.status}): ${errText.slice(0, 200)}`);
  }

  const result = await resp.json();

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    compile_output: result.compile_output || "",
    status: result.status?.description || "",
    status_id: result.status?.id || 0,
    time: result.time,
    memory: result.memory,
    source: "judge0",
  };
}