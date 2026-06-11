import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getAppUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const appUrl = await getAppUrl();
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.redirect(
      `${appUrl}/login?error=unauthenticated`
    );
  }

  const userId = (session.user as any).id as string;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("facebook_oauth_state")?.value;
  const codeVerifier = cookieStore.get("facebook_code_verifier")?.value;
  cookieStore.delete("facebook_oauth_state");
  cookieStore.delete("facebook_code_verifier");

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=facebook_csrf_failed`
    );
  }

  if (!code || !codeVerifier) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=facebook_no_code`
    );
  }

  try {
    const redirectUri = `${appUrl}/api/oauth/facebook/callback`;

    const tokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?${new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      })}`,
      { method: "GET" }
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || "Failed to get access token");
    }

    const profileRes = await fetch(
      `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${tokenData.access_token}`
    );
    const profile = await profileRes.json();

    const encryptedToken = encrypt(tokenData.access_token);

    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: "facebook" } },
      create: {
        userId,
        platform: "facebook",
        platformUserId: profile.id,
        platformUsername: profile.name,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true,
        metadata: {},
      },
      update: {
        platformUserId: profile.id,
        platformUsername: profile.name,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?connected=facebook`
    );
  } catch (error: any) {
    console.error("Facebook OAuth error:", error);
    const errMsg = error?.message || String(error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=facebook_failed&message=${encodeURIComponent(errMsg)}`
    );
  }
}
