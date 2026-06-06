import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  pdfBase64: z.string().min(10),
  fileName: z.string().min(1).max(200),
  role: z.string().max(100).optional().default(""),
  email: z.string().email(),
});

export type AnalysisResult = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestions: string[];
  atsFeedback: string;
  recommendation: string;
  emailSent: boolean;
  emailError?: string;
};

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function callGeminiAI(resumeText: string, role: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const targetRole = role?.trim() || "general best practices (no specific role provided)";
  const system = `You are ResumeLens, an expert technical recruiter and resume coach. Analyze resumes critically but constructively. Always respond with a JSON object matching the provided schema. Score harshly: average resumes score 55-70, strong resumes 75-85, exceptional 90+.`;
  const user = `Analyze this resume for the role: "${targetRole}".

RESUME CONTENT:
"""
${resumeText.slice(0, 15000)}
"""

Return a thorough evaluation: numeric score (0-100), a 2-sentence summary, key strengths, weaknesses, missing skills for this role, concrete improvement suggestions, ATS-friendliness feedback, and a final recommendation.`;

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            summary: { type: "STRING" },
            strengths: { type: "ARRAY", items: { type: "STRING" } },
            weaknesses: { type: "ARRAY", items: { type: "STRING" } },
            missingSkills: { type: "ARRAY", items: { type: "STRING" } },
            suggestions: { type: "ARRAY", items: { type: "STRING" } },
            atsFeedback: { type: "STRING" },
            recommendation: { type: "STRING" },
          },
          required: [
            "score",
            "summary",
            "strengths",
            "weaknesses",
            "missingSkills",
            "suggestions",
            "atsFeedback",
            "recommendation",
          ],
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Gemini rate limit exceeded. Please try again in a moment.");
    throw new Error(`Gemini API error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("Gemini returned no analysis");
  return JSON.parse(jsonText) as Omit<AnalysisResult, "emailSent" | "emailError">;
}

function buildEmailHtml(a: Omit<AnalysisResult, "emailSent" | "emailError">, role: string) {
  const list = (items: string[]) =>
    items.map((i) => `<li style="margin:6px 0;color:#1f2937;">${escapeHtml(i)}</li>`).join("");
  const roleLabel = role?.trim() ? escapeHtml(role) : "General Evaluation";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
    <div style="background:linear-gradient(135deg,#6366f1,#a78bfa);border-radius:20px;padding:32px;color:#fff;text-align:center;">
      <div style="font-size:13px;letter-spacing:2px;opacity:.85;text-transform:uppercase;">ResumeLens Report</div>
      <div style="font-size:54px;font-weight:800;margin:14px 0 4px;">${a.score}<span style="font-size:22px;opacity:.8;">/100</span></div>
      <div style="font-size:14px;opacity:.9;">Role: ${roleLabel}</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px;margin-top:20px;box-shadow:0 1px 3px rgba(15,23,42,.06);">
      <h2 style="margin:0 0 8px;color:#0f172a;">Summary</h2>
      <p style="color:#334155;line-height:1.6;margin:0;">${escapeHtml(a.summary)}</p>
    </div>
    ${section("✅ Strengths", list(a.strengths))}
    ${section("⚠️ Weaknesses", list(a.weaknesses))}
    ${section("🎯 Missing Skills", list(a.missingSkills))}
    ${section("💡 Improvement Suggestions", list(a.suggestions))}
    ${section("🤖 ATS Feedback", `<p style="color:#334155;line-height:1.6;margin:0;">${escapeHtml(a.atsFeedback)}</p>`)}
    ${section("🏁 Final Recommendation", `<p style="color:#334155;line-height:1.6;margin:0;">${escapeHtml(a.recommendation)}</p>`)}
    <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">Generated by ResumeLens · AI Resume Analyzer</div>
  </div></body></html>`;
}

function section(title: string, inner: string) {
  return `<div style="background:#fff;border-radius:16px;padding:24px 28px;margin-top:16px;box-shadow:0 1px 3px rgba(15,23,42,.06);">
    <h3 style="margin:0 0 10px;color:#4338ca;font-size:16px;">${title}</h3>
    <ul style="margin:0;padding-left:20px;">${inner}</ul>
  </div>`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toBase64Url(s: string) {
  // Use Buffer (available in Workers nodejs_compat)
  return Buffer.from(s, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendGmail(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) throw new Error("Gmail credentials not configured");

  const raw = toBase64Url(
    [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\r\n"),
  );

  const res = await fetch(
    "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${t.slice(0, 200)}`);
  }
}

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    // Decode base64 PDF
    const base64 = data.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    let resumeText = "";
    try {
      resumeText = await extractPdfText(bytes);
    } catch (e) {
      throw new Error("Could not read PDF. Make sure it's a valid, text-based resume PDF.");
    }
    if (resumeText.trim().length < 80) {
      throw new Error(
        "Resume text is too short or unreadable. If your PDF is scanned/image-based, please upload a text-based PDF.",
      );
    }

    const analysis = await callLovableAI(resumeText, data.role);

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const html = buildEmailHtml(analysis, data.role);
      await sendGmail(
        data.email,
        `Your ResumeLens Report — Score ${analysis.score}/100`,
        html,
      );
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Email delivery failed";
    }

    return { ...analysis, emailSent, emailError };
  });
