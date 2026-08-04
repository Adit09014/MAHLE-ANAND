import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthUser } from "@/lib/types";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("rr_session");

  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const user: AuthUser = JSON.parse(sessionCookie.value);
    return NextResponse.json({ authenticated: true, user });
  } catch (e) {
    return NextResponse.json({ authenticated: false });
  }
}
