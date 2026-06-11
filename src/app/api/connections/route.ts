import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const connections = await prisma.platformConnection.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      isActive: true,
    },
  });

  return NextResponse.json(connections);
}
