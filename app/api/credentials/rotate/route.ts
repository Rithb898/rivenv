import { AuthorizationError } from "@/lib/authorization";
import { rotateCredential } from "@/lib/credential-service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return Response.json(
    { error: "Unable to rotate credential." },
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
    !isNonEmptyString(body.credentialId) ||
    typeof body.value !== "string"
  ) {
    return Response.json(
      {
        error: "workspaceId, credentialId, and value are required.",
      },
      { status: 400 },
    );
  }

  if (
    body.changeReason !== undefined &&
    body.changeReason !== null &&
    typeof body.changeReason !== "string"
  ) {
    return Response.json(
      { error: "Invalid changeReason." },
      { status: 400 },
    );
  }

  try {
    const result = await rotateCredential({
      workspaceId: body.workspaceId,
      credentialId: body.credentialId,
      value: body.value,
      changeReason:
        typeof body.changeReason === "string"
          ? body.changeReason
          : body.changeReason,
    });

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
