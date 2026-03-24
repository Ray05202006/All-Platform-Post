import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.redirect(`${appUrl}/login?error=unauthenticated`);
  }

  const userId = (session.user as any).id as string;
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=instagram_no_code`
    );
  }

  try {
    const redirectUri = `${appUrl}/api/oauth/instagram/callback`;

    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
      })}`
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error?.message || "Failed to get access token"
      );
    }

    // Get Facebook Pages to find Instagram Business Account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`
    );
    const pagesData = await pagesRes.json();

    let instagramAccountId = "";
    let instagramUsername = "";

    if (pagesData.data?.length > 0) {
      // Check each page for an Instagram Business Account
      for (const page of pagesData.data) {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${tokenData.access_token}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          instagramAccountId = igData.instagram_business_account.id;

          // Get Instagram username
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
