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
    return NextResponse.redirect(`${appUrl}/login?error=unauthenticated`);
  }

  const userId = (session.user as any).id as string;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=twitter_denied`
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("twitter_oauth_state")?.value;
  const codeVerifier = cookieStore.get("twitter_code_verifier")?.value;
  cookieStore.delete("twitter_oauth_state");
  cookieStore.delete("twitter_code_verifier");

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=twitter_csrf_failed`
    );
  }

  if (!code || !codeVerifier) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=twitter_no_code`
    );
  }

  try {
    const clientId = process.env.TWITTER_CLIENT_ID!;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/oauth/twitter/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to get Twitter access token");
    }

    // Get user profile
    const profileRes = await fetch("https://api.x.com/2/users/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    const profile = profileData.data;

    if (!profile?.id) {
      throw new Error("Failed to get Twitter user profile");
    }

    const encryptedToken = encrypt(tokenData.access_token);
    const encryptedRefresh = tokenData.refresh_token
      ? encrypt(tokenData.refresh_token)
      : null;

    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: "twitter" } },
      create: {
        userId,
        platform: "twitter",
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: encryptedToken,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        isActive: true,
        metadata: {},
      },
      update: {
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: encryptedToken,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?connected=twitter`
    );
  } catch (err: any) {
    console.error("Twitter OAuth error:", err);
    const msg = encodeURIComponent(err?.message || "unknown");
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=twitter_failed&detail=${msg}`
    );
  }
}
