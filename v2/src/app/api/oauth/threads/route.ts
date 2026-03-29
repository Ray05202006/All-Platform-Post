import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState } from "@/lib/encryption";
import { getAppUrl } from "@/lib/url";

export async function GET() {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl}/api/oauth/threads/callback`;
  const scopes = "threads_basic,threads_content_publish,threads_manage_replies";

  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set("threads_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state,
  });

  return NextResponse.redirect(
    `https://threads.net/oauth/authorize?${params.toString()}`
  );
}
