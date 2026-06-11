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

  const cookieStore = await cookies();
  const storedState = cookieStore.get("instagram_oauth_state")?.value;
  const codeVerifier = cookieStore.get("instagram_code_verifier")?.value;
  cookieStore.delete("instagram_oauth_state");
  cookieStore.delete("instagram_code_verifier");

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=instagram_csrf_failed`
    );
  }

  if (!code || !codeVerifier) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=instagram_no_code`
    );
  }

  try {
    const redirectUri = `${appUrl}/api/oauth/instagram/callback`;

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      })}`
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error?.message || "Failed to get access token"
      );
    }

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`
    );
    const pagesData = await pagesRes.json();

    let instagramAccountId = "";
    let instagramUsername = "";

    if (pagesData.data?.length > 0) {
      for (const page of pagesData.data) {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${tokenData.access_token}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          instagramAccountId = igData.instagram_business_account.id;

          const igProfileRes = await fetch(
            `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=username&access_token=${tokenData.access_token}`
          );
          const igProfile = await igProfileRes.json();
          instagramUsername = igProfile.username || "";
          break;
        }
      }
    }

    if (!instagramAccountId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?error=instagram_no_business_account`
      );
    }

    const encryptedToken = encrypt(tokenData.access_token);

    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: "instagram" } },
      create: {
        userId,
        platform: "instagram",
        platformUserId: instagramAccountId,
        platformUsername: instagramUsername,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true,
        metadata: {},
      },
      update: {
        platformUserId: instagramAccountId,
        platformUsername: instagramUsername,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?connected=instagram`
    );
  } catch (error) {
    console.error("Instagram OAuth error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=instagram_failed`
    );
  }
}
