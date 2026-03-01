import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getAdminUserData, AdminUserData } from "@/lib/firebase/admin-users";

/**
 * Verify Firebase Auth token from the Authorization header.
 * Returns the decoded token if valid, or a 401 Response if invalid.
 *
 * Expected header format: Authorization: Bearer <idToken>
 */
export async function verifyAuth(
  req: NextRequest
): Promise<{ uid: string; user?: AdminUserData } | NextResponse> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7); // Remove "Bearer "

  if (!idToken) {
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 }
    );
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json(
        { error: "Email missing from token" },
        { status: 401 }
      );
    }

    // Firestore上でステータスがactiveであるかチェック
    const userData = await getAdminUserData(email);
    if (!userData || userData.status !== "active") {
      return NextResponse.json(
        { error: "Account is pending or inactive" },
        { status: 403 }
      );
    }

    return { uid: decodedToken.uid, user: userData };
  } catch (error) {
    console.error("[auth] Token verification failed:", error);
    return NextResponse.json(
      { error: "Invalid or expired authentication token" },
      { status: 401 }
    );
  }
}
