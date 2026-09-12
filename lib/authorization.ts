import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceMember } from "@/lib/db/schema";
import { getSession } from "@/lib/get-session";

export type WorkspaceRole = "owner" | "member";

export class AuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new AuthorizationError(401, "Authentication required.");
  }

  return session;
}

export async function requireWorkspaceMember(workspaceId: string) {
  const session = await requireSession();

  const [membership] = await db
    .select({
      workspaceId: workspaceMember.workspaceId,
      userId: workspaceMember.userId,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new AuthorizationError(403, "Workspace access denied.");
  }

  return { session, membership };
}

export async function requireWorkspaceOwner(workspaceId: string) {
  const access = await requireWorkspaceMember(workspaceId);

  if (access.membership.role !== "owner") {
    throw new AuthorizationError(403, "Workspace owner access required.");
  }

  return access;
}
