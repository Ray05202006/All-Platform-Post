import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl}/api/oauth/facebook/callback`;
  // pages_show_list and pages_manage_posts require App Review approval.
  // For development, use only pre-approved permissions.
  const scopes = "public_profile,email";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
