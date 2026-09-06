import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PISTON_URL = Deno.env.get("PISTON_URL") || "https://emkc.org";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { language, version, code, stdin } = await req.json();

    if (!language || !code) {
      return new Response(
        JSON.stringify({ error: "language and code are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Map our language names to Piston language identifiers
    const langMap: Record<string, { language: string; version?: string }> = {
      javascript: { language: "javascript", version: "18.15.0" },
      python: { language: "python", version: "3.10.0" },
      java: { language: "java", version: "15.0.2" },
      c: { language: "c", version: "10.2.0" },
      cpp: { language: "c++", version: "10.2.0" },
      ruby: { language: "ruby", version: "3.0.1" },
      go: { language: "go", version: "1.16.2" },
      rust: { language: "rust", version: "1.68.2" },
      typescript: { language: "typescript", version: "5.0.3" },
      php: { language: "php", version: "8.2.3" },
      swift: { language: "swift", version: "5.3.3" },
      kotlin: { language: "kotlin", version: "1.8.20" },
    };

    const langInfo = langMap[language] || { language, version: version || "*" };

    // Call Piston API
    const pistonResponse = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langInfo.language,
        version: langInfo.version || "*",
        files: [{ content: code }],
        stdin: stdin || "",
        run_timeout: 10000,
        compile_timeout: 10000,
      }),
    });

    if (!pistonResponse.ok) {
      const errText = await pistonResponse.text();
      return new Response(
        JSON.stringify({ error: `Piston error: ${errText}` }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const result = await pistonResponse.json();

    // Extract meaningful output
    const stdout = result.run?.stdout || "";
    const stderr = result.run?.stderr || "";
    const code_ = result.run?.code;
    const compileOutput = result.compile?.stderr || "";

    return new Response(
      JSON.stringify({
        stdout,
        stderr,
        compileOutput,
        exitCode: code_,
        language: result.language,
        version: result.version,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
