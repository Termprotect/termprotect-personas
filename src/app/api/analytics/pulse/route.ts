import { apiOk, apiInternalError } from "@/lib/api/responses";
import { requireSession } from "@/lib/api/auth-helpers";
import { getPulse } from "@/lib/services/analytics/pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;

  try {
    const data = await getPulse();
    return apiOk(data);
  } catch (err) {
    console.error("GET /api/analytics/pulse error:", err);
    return apiInternalError();
  }
}
