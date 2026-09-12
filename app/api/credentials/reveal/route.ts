import { AuthorizationError } from "@/lib/authorization";
import { revealCredential } from "@/lib/credential-service";

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return Response.json(
    { error: "Unable to reveal credential." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const credentialId = url.searchParams.get("credentialId");

  if (!workspaceId || !credentialId) {
    return Response.json(
      { error: "workspaceId and credentialId are required." },
      { status: 400 },
    );
  }

  try {
    const result = await revealCredential({ workspaceId, credentialId });

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
