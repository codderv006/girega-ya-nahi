import { ZodError } from "zod";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import type { PipelineEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON. The biscuit is confused." }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (e: PipelineEvent) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true; // client went away
        }
      };
      try {
        await runPipeline(body, send);
      } catch (e) {
        const message =
          e instanceof ZodError
            ? `Validation failed: ${e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
            : e instanceof Error
              ? e.message
              : "The pipeline fell into the chai.";
        send({ type: "error", message });
      } finally {
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
