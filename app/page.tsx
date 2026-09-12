import { and, eq } from "drizzle-orm";
import Auth from "@/components/Auth";
import CredentialsDashboard, {
  type DashboardCredential,
} from "@/components/CredentialsDashboard";
import { db } from "@/lib/db";
import { collection } from "@/lib/db/schema";
import { listCredentials } from "@/lib/credential-service";
import { ensureDefaultWorkspace } from "@/lib/ensure-workspace";
import { getSession } from "@/lib/get-session";

const HomePage = async () => {
  const session = await getSession();

  if (!session) {
    return <Auth />;
  }

  const defaultWorkspace = await ensureDefaultWorkspace(session.user);
  const [personalCollection] = await db
    .select({
      id: collection.id,
      name: collection.name,
    })
    .from(collection)
    .where(
      and(
        eq(collection.workspaceId, defaultWorkspace.id),
        eq(collection.name, "Personal"),
      ),
    )
    .limit(1);

  if (!personalCollection) {
    throw new Error("Personal collection is missing.");
  }

  const credentials = await listCredentials(
    defaultWorkspace.id,
    personalCollection.id,
  );

  const initialCredentials: DashboardCredential[] = credentials.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <CredentialsDashboard
      workspaceId={defaultWorkspace.id}
      collectionId={personalCollection.id}
      workspaceName={defaultWorkspace.name}
      user={session.user}
      initialCredentials={initialCredentials}
    />
  );
};

export default HomePage