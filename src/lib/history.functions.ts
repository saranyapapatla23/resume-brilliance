import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveSchema = z.object({
  fileName: z.string().min(1).max(200),
  role: z.string().max(100).default(""),
  jobDescription: z.string().max(15000).default(""),
  score: z.number().int().min(0).max(100),
  matchPercent: z.number().int().min(0).max(100).optional(),
  result: z.record(z.string(), z.unknown()),
});

export const saveAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("analyses").insert({
      user_id: userId,
      file_name: data.fileName,
      role: data.role,
      job_description: data.jobDescription,
      score: data.score,
      match_percent: data.matchPercent ?? null,
      result: data.result,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("analyses")
      .select("id, file_name, role, score, match_percent, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { analyses: data ?? [] };
  });

export const getAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { analysis: row };
  });
