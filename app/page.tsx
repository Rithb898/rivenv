import Auth from "@/components/Auth";
import CredentialsDashboard, {
  type DashboardCollection,
  type DashboardCredential,
} from "@/components/CredentialsDashboard";
import {
  listCredentials,
  listWorkspaceCollections,
} from "@/lib/credential-service";
import { ensureDefaultWorkspace } from "@/lib/ensure-workspace";
import { getSession } from "@/lib/get-session";

const HomePage = async () => {
  const session = await getSession();

  if (!session) {
    return <Auth />;
  }

  const defaultWorkspace = await ensureDefaultWorkspace(session.user);
  const collections = await listWorkspaceCollections(defaultWorkspace.id);
  const personalCollection = collections.find(
    (item) => item.type === "personal",
  );

  if (!personalCollection) {
    throw new Error("Personal collection is missing.");
  }

  const credentials = await listCredentials(
    defaultWorkspace.id,
    personalCollection.id,
  );

  const initialCollections: DashboardCollection[] = collections.map((item) => ({
    id: item.id,
    value: item.id,
    name: item.name,
    label:
      item.type === "personal"
        ? "Personal"
        : `${item.projectName ?? "Project"} / ${item.environmentName ?? item.name}`,
    type: item.type,
    projectId: item.projectId,
    projectName: item.projectName,
    environmentId: item.environmentId,
    environmentName: item.environmentName,
  }));

  const initialCredentials: DashboardCredential[] = credentials.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <CredentialsDashboard
      workspaceId={defaultWorkspace.id}
      collectionId={personalCollection.id}
      collections={initialCollections}
      workspaceName={defaultWorkspace.name}
      user={session.user}
      initialCredentials={initialCredentials}
    />
  );
};

export default HomePage