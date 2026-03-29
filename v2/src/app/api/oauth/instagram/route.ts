import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl}/api/oauth/instagram/callback`;
  const scopes =
    "pages_show_list,instagram_basic,instagram_content_publish";

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
