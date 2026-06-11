import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as crypto from "crypto";
import { getAppUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET() {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl}/api/oauth/facebook/callback`;
  const scopes = "public_profile,pages_show_list,pages_manage_posts";

  const codeVerifier = base64urlEncode(crypto.randomBytes(32));
  const codeChallenge = base64urlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64urlEncode(crypto.randomBytes(16));

  const cookieStore = await cookies();
  cookieStore.set("facebook_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("facebook_code_verifier", codeVerifier, {
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
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`
  );
}
