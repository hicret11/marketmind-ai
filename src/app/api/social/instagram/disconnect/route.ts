import { toSocialErrorResponse } from "@/lib/social/errors";
import { disconnectAccount, getConnectedAccount } from "@/lib/social/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const account = await getConnectedAccount();
    if (account) await disconnectAccount(account.id);
    return Response.json({ ok: true });
  } catch (error) {
    return toSocialErrorResponse(error);
  }
}
