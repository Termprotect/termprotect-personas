import { apiOk, apiInternalError } from "@/lib/api/responses";
import { requireSession } from "@/lib/api/auth-helpers";
import { getMyToday } from "@/lib/services/jornada/today";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;

  try {
    const data = await getMyToday(session.value.user.id);
    return apiOk(data);
  } catch (err) {
    console.error("GET /api/jornada/me/today error:", err);
    return apiInternalError();
  }
}
