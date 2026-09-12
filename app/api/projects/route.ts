import { AuthorizationError } from "@/lib/authorization";
import { createProject } from "@/lib/credential-service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body) || !isNonEmptyString(body.workspaceId) || !isNonEmptyString(body.name)) {
    return Response.json(
      { error: "workspaceId and name are required." },
      { status: 400 },
    );
  }

  try {
    const result = await createProject({
      workspaceId: body.workspaceId,
      name: body.name,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: "Unable to create project." },
      { status: 500 },
    );
  }
}
