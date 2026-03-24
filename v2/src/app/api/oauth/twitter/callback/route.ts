import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=unauthenticated`
    );
  }

  const userId = (session.user as any).id as string;
  const oauthToken = request.nextUrl.searchParams.get("oauth_token");
  const oauthVerifier = request.nextUrl.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_no_verifier`
    );
  }

  const cookieStore = await cookies();
  const tokenSecret = cookieStore.get("twitter_oauth_token_secret")?.value;

  if (!tokenSecret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_no_secret`
    );
  }

  // Clear the cookie
  cookieStore.delete("twitter_oauth_token_secret");

  try {
    const res = await fetch(
      `https://api.twitter.com/oauth/access_token?${new URLSearchParams({
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier,
      })}`,
      { method: "POST" }
    );

    const body = await res.text();
    const params = new URLSearchParams(body);
    const accessToken = params.get("oauth_token");
    const accessTokenSecret = params.get("oauth_token_secret");
    const twitterUserId = params.get("user_id");
    const screenName = params.get("screen_name");

    if (!accessToken || !accessTokenSecret) {
      throw new Error("Failed to get Twitter access token");
    }

    const encryptedToken = encrypt(accessToken);
    const encryptedSecret = encrypt(accessTokenSecret);

    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: "twitter" } },
      create: {
        userId,
        platform: "twitter",
        platformUserId: twitterUserId || "",
        platformUsername: screenName || "",
        accessToken: encryptedToken,
        refreshToken: encryptedSecret,
        isActive: true,
        metadata: {},
      },
      update: {
        platformUserId: twitterUserId || "",
        platformUsername: screenName || "",
        accessToken: encryptedToken,
        refreshToken: encryptedSecret,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?connected=twitter`
    );
  } catch (error) {
    console.error("Twitter OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=twitter_failed`
    );
  }
}
