import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as crypto from "crypto";
import * as oauth from "oauth-1.0a";

export async function GET() {
  const apiKey = process.env.TWITTER_API_KEY!;
  const apiSecret = process.env.TWITTER_API_SECRET!;
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/twitter/callback`;

  const oauthClient = new (oauth as any).default({
    consumer: { key: apiKey, secret: apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  const requestData = {
    url: "https://api.twitter.com/oauth/request_token",
    method: "POST",
    data: { oauth_callback: callbackUrl },
  };

  const headers = oauthClient.toHeader(oauthClient.authorize(requestData));

  const res = await fetch(requestData.url, {
    method: "POST",
    headers: { Authorization: headers.Authorization },
  });

  const body = await res.text();
  const params = new URLSearchParams(body);
  const oauthToken = params.get("oauth_token");
  const oauthTokenSecret = params.get("oauth_token_secret");

  if (!oauthToken || !oauthTokenSecret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_request_token_failed`
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("twitter_oauth_token_secret", oauthTokenSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(
    `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`
  );
}
