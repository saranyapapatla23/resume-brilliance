import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Loader2, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAnalyses } from "@/lib/history.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Your analyses — ResumeLens" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listAnalyses);
  const { data, isLoading, error } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => fetchList(),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen w-full px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> New analysis
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold">Your past analyses</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Every resume you've analyzed while signed in is saved here.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="surface-card p-6 text-sm text-destructive-foreground">
            Couldn't load history: {(error as Error).message}
          </div>
        ) : !data?.analyses.length ? (
          <div className="surface-card p-10 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No analyses yet.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Analyze your first resume
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.analyses.map((a) => (
              <li key={a.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-primary-glow" />
                      <span className="truncate font-medium">{a.file_name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {a.role || "General evaluation"} ·{" "}
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {a.match_percent != null && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">JD match</div>
                        <div className="text-sm font-semibold text-accent">
                          {a.match_percent}%
                        </div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className="flex items-center gap-1 text-lg font-bold text-gradient">
                        <Trophy className="size-4 text-primary-glow" />
                        {a.score}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
