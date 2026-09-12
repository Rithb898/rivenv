import { AuthorizationError } from "@/lib/authorization";
import { createCredential } from "@/lib/credential-service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return typeof value === "string" ? value : undefined;
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return Response.json(
    { error: "Unable to create credential." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !isNonEmptyString(body.workspaceId) ||
    !isNonEmptyString(body.collectionId) ||
    !isNonEmptyString(body.name) ||
    typeof body.value !== "string"
  ) {
    return Response.json(
      {
        error:
          "workspaceId, collectionId, name, and value are required.",
      },
      { status: 400 },
    );
  }

  const provider = optionalString(body.provider);
  const exportName = optionalString(body.exportName);
  const changeReason = optionalString(body.changeReason);

  if (
    (body.provider !== undefined && provider === undefined) ||
    (body.exportName !== undefined && exportName === undefined) ||
    (body.changeReason !== undefined && changeReason === undefined) ||
    (body.type !== undefined && typeof body.type !== "string")
  ) {
    return Response.json(
      { error: "Invalid credential metadata." },
      { status: 400 },
    );
  }

  try {
    const result = await createCredential({
      workspaceId: body.workspaceId,
      collectionId: body.collectionId,
      name: body.name,
      type: typeof body.type === "string" ? body.type : undefined,
      provider,
      exportName,
      value: body.value,
      changeReason,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
