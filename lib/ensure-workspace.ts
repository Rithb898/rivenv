import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  collection,
  workspace,
  workspaceMember,
} from "./db/schema";

type WorkspaceUser = {
  id: string;
  name: string;
};

export async function ensureDefaultWorkspace(user: WorkspaceUser) {
  const workspaceSlug = `personal-${user.id}`;

  let [defaultWorkspace] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, workspaceSlug))
    .limit(1);

  if (!defaultWorkspace) {
    const workspaceId = crypto.randomUUID();
    const collectionId = crypto.randomUUID();

    try {
      await db.batch([
        db.insert(workspace).values({
          id: workspaceId,
          name: `${user.name}'s Workspace`,
          slug: workspaceSlug,
          createdBy: user.id,
        }),
        db.insert(workspaceMember).values({
          workspaceId,
          userId: user.id,
          role: "owner",
        }),
        db.insert(collection).values({
          id: collectionId,
          workspaceId,
          name: "Personal",
          type: "personal",
          createdBy: user.id,
        }),
      ]);
    } catch (error) {
      [defaultWorkspace] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.slug, workspaceSlug))
        .limit(1);

      if (!defaultWorkspace) {
        throw error;
      }
    }

    if (!defaultWorkspace) {
      [defaultWorkspace] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .limit(1);
    }
  }

  if (!defaultWorkspace) {
    throw new Error("Unable to create the default workspace.");
  }

  await db
    .insert(workspaceMember)
    .values({
      workspaceId: defaultWorkspace.id,
      userId: user.id,
      role: "owner",
    })
    .onConflictDoNothing();

  await db
    .insert(collection)
    .values({
      id: crypto.randomUUID(),
      workspaceId: defaultWorkspace.id,
      name: "Personal",
      type: "personal",
      createdBy: user.id,
    })
    .onConflictDoNothing();

  return defaultWorkspace;
}
