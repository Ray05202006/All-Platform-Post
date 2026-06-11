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
  const redirectUri = `${appUrl}/api/oauth/instagram/callback`;
  const scopes =
    "pages_show_list,instagram_basic,instagram_content_publish";

  const codeVerifier = base64urlEncode(crypto.randomBytes(32));
  const codeChallenge = base64urlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64urlEncode(crypto.randomBytes(16));

  const cookieStore = await cookies();
  cookieStore.set("instagram_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("instagram_code_verifier", codeVerifier, {
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
