import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, type FormEvent } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Target,
  Lightbulb,
  Bot,
  Trophy,
  Mail,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeResume, type AnalysisResult } from "@/lib/analyze.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeLens — AI Resume Analyzer & Scorer" },
      {
        name: "description",
        content:
          "Upload your resume, pick a role, and get an instant AI score with detailed feedback delivered to your inbox.",
      },
      { property: "og:title", content: "ResumeLens — AI Resume Analyzer" },
      {
        property: "og:description",
        content: "Instant resume scoring + a full improvement report emailed to you.",
      },
    ],
  }),
  component: Home,
});

const ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "HR / Human Resources",
  "Other",
] as const;

const LOADING_MESSAGES = [
  "Reading your resume...",
  "Analyzing structure and keywords...",
  "Scoring for the selected role...",
  "Drafting your improvement report...",
  "Sending it to your inbox...",
];

function Home() {
  const analyze = useServerFn(analyzeResume);

  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<string>("");
  const [customRole, setCustomRole] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("PDF must be under 10 MB.");
      return;
    }
    setFile(f);
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = String(reader.result || "");
        resolve(r.includes(",") ? r.split(",")[1] : r);
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(f);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) return setError("Please upload your resume PDF.");
    if (!email) return setError("Please enter your email.");

    const finalRole = role === "Other" ? customRole.trim() : role;

    setLoading(true);
    let idx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const ticker = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 1800);

    try {
      const pdfBase64 = await fileToBase64(file);
      const res = await analyze({
        data: { pdfBase64, fileName: file.name, role: finalRole, email },
      });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setError(null);
  }

  return (
    <main className="min-h-screen w-full px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-accent" />
            AI-Powered Resume Intelligence
          </div>
          <h1 className="mt-5 text-5xl font-bold md:text-6xl">
            <span className="text-gradient">ResumeLens</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Upload your resume, pick a target role, and get an instant score plus a detailed
            improvement report emailed straight to your inbox.
          </p>
        </header>

        {result ? (
          <ResultView result={result} onReset={reset} email={email} />
        ) : (
          <form onSubmit={onSubmit} className="surface-card p-6 md:p-8">
            {/* Upload zone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Resume PDF</Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0] ?? null);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/40 hover:border-primary/60 hover:bg-background/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="size-8 text-primary-glow" />
                    <div className="text-left">
                      <div className="font-medium text-foreground">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="ml-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto size-10 text-muted-foreground transition-colors group-hover:text-primary-glow" />
                    <div className="mt-3 font-medium">
                      Drop your PDF here or <span className="text-primary-glow">browse</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      PDF only · up to 10 MB · text-based resumes work best
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target Role (optional)</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-11 bg-input/60">
                    <SelectValue placeholder="General evaluation" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {role === "Other" && (
                  <Input
                    placeholder="e.g. Data Scientist, Product Designer"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="mt-2 h-11 bg-input/60"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Your email</Label>
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-input/60"
                />
                <p className="text-xs text-muted-foreground">
                  We'll email your full report here.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-7 h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:brightness-110"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {loadingMsg}
                </>
              ) : (
                <>
                  <Sparkles className="size-5" />
                  Analyze My Resume
                </>
              )}
            </Button>

            {loading && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                This usually takes 10-20 seconds.
              </p>
            )}
          </form>
        )}

        {!result && (
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Target, title: "Role-targeted scoring" },
              { icon: Bot, title: "ATS-friendly feedback" },
              { icon: Mail, title: "Detailed report by email" },
            ].map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="surface-card flex items-center gap-3 p-4 text-sm text-muted-foreground"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary-glow">
                  <Icon className="size-4" />
                </div>
                {title}
              </div>
            ))}
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Powered by Lovable AI · Reports delivered via Gmail
        </footer>
      </div>
    </main>
  );
}

function ResultView({
  result,
  onReset,
  email,
}: {
  result: AnalysisResult;
  onReset: () => void;
  email: string;
}) {
  const { score } = result;
  const tone =
    score >= 85 ? "Excellent" : score >= 70 ? "Strong" : score >= 55 ? "Decent" : "Needs work";

  return (
    <div className="space-y-6">
      <div className="surface-card glow-ring overflow-hidden">
        <div className="relative p-8 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Your resume score
          </div>
          <div className="mt-3 flex items-end justify-center gap-2">
            <span className="text-gradient text-7xl font-bold leading-none md:text-8xl">
              {score}
            </span>
            <span className="mb-2 text-2xl text-muted-foreground">/100</span>
          </div>
          <div className="mt-2 text-sm font-medium text-accent">{tone}</div>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            {result.summary}
          </p>

          {result.emailSent ? (
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              📩 Your detailed report has been sent to{" "}
              <span className="font-medium">{email}</span>
            </div>
          ) : (
            <div className="mx-auto mt-6 inline-flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-left text-xs text-destructive-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Your analysis is ready, but the email didn't go through.
                {result.emailError ? ` (${result.emailError})` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel icon={CheckCircle2} title="Strengths" accent="text-success">
          <ul className="space-y-2 text-sm">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel icon={AlertCircle} title="Weaknesses" accent="text-destructive">
          <ul className="space-y-2 text-sm">
            {result.weaknesses.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel icon={Target} title="Missing Skills" accent="text-primary-glow">
          <ul className="space-y-2 text-sm">
            {result.missingSkills.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-glow" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel icon={Lightbulb} title="Suggestions" accent="text-accent">
          <ul className="space-y-2 text-sm">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel icon={Bot} title="ATS Feedback" accent="text-primary-glow">
          <p className="text-sm text-muted-foreground">{result.atsFeedback}</p>
        </Panel>
        <Panel icon={Trophy} title="Final Recommendation" accent="text-accent">
          <p className="text-sm text-muted-foreground">{result.recommendation}</p>
        </Panel>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onReset}
          variant="outline"
          className="rounded-xl border-border bg-card/60 px-6"
        >
          Analyze another resume
        </Button>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: typeof CheckCircle2;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`size-4 ${accent}`} />
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}
