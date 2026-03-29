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
      `${appUrl}/dashboard/settings?error=threads_denied`
    );
  }

  // CSRF validation: compare state cookie with query param
  const cookieStore = await cookies();
  const storedState = cookieStore.get("threads_oauth_state")?.value;
  cookieStore.delete("threads_oauth_state");

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=threads_csrf_failed`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=threads_no_code`
    );
  }

  try {
    const clientId = process.env.FACEBOOK_APP_ID!;
    const clientSecret = process.env.FACEBOOK_APP_SECRET!;
    const redirectUri = `${appUrl}/api/oauth/threads/callback`;

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      "https://graph.threads.net/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error?.message || "Failed to get Threads access token"
      );
    }

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.threads.net/access_token?${new URLSearchParams({
        grant_type: "th_exchange_token",
        client_secret: clientSecret,
        access_token: tokenData.access_token,
      })}`
    );

    const longLivedData = await longLivedRes.json();
    if (!longLivedRes.ok || !longLivedData.access_token) {
      throw new Error("Failed to get long-lived Threads token");
    }

    // Get user profile
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?${new URLSearchParams({
        fields: "id,username",
        access_token: longLivedData.access_token,
      })}`
    );

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.id) {
      throw new Error("Failed to get Threads profile");
    }

    const encryptedToken = encrypt(longLivedData.access_token);
    const expiresIn = longLivedData.expires_in || 5184000; // default 60 days

    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: "threads" } },
      create: {
        userId,
        platform: "threads",
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true,
        metadata: {},
      },
      update: {
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?connected=threads`
    );
  } catch (err) {
    console.error("Threads OAuth error:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=threads_failed`
    );
  }
}
