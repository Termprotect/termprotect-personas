import { NextRequest } from "next/server";
import { apiOk, apiInternalError } from "@/lib/api/responses";
import { requirePermission } from "@/lib/api/auth-helpers";
import { parseSearchParams } from "@/lib/api/parse-request";
import { can } from "@/lib/permissions";
import { analyticsFiltersSchema } from "@/lib/validators/analytics";
import { buildEmployeeScope } from "@/lib/services/analytics/scope";
import { getAlerts } from "@/lib/services/analytics/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requirePermission(can.viewAnalytics);
  if (!session.ok) return session.response;

  const parsed = parseSearchParams(req, analyticsFiltersSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const scope = buildEmployeeScope({
      role: session.value.user.role,
      userId: session.value.user.id,
      sedeId: parsed.data.sedeId,
    });
    const data = await getAlerts(scope);
    return apiOk(data);
  } catch (err) {
    console.error("GET /api/analytics/alerts error:", err);
    return apiInternalError();
  }
}
