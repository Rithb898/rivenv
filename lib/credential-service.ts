import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditEvent,
  collection,
  credential,
  credentialVersion,
} from "@/lib/db/schema";
import {
  AuthorizationError,
  requireWorkspaceMember,
} from "@/lib/authorization";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/credential-crypto";

type CredentialInput = {
  workspaceId: string;
  collectionId: string;
  name: string;
  type?: string;
  provider?: string | null;
  exportName?: string | null;
  value: string;
  changeReason?: string | null;
};

type RotateCredentialInput = {
  workspaceId: string;
  credentialId: string;
  value: string;
  changeReason?: string | null;
};

function metadataForCredential(input: {
  name: string;
  type: string;
  provider: string | null;
  exportName: string | null;
  changeReason?: string | null;
}) {
  return JSON.stringify({
    name: input.name,
    type: input.type,
    provider: input.provider,
    exportName: input.exportName,
    changeReason: input.changeReason ?? null,
  });
}

async function requireCollectionInWorkspace(
  workspaceId: string,
  collectionId: string,
) {
  const [ownedCollection] = await db
    .select({
      id: collection.id,
      environmentId: collection.environmentId,
    })
    .from(collection)
    .where(
      and(
        eq(collection.id, collectionId),
        eq(collection.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!ownedCollection) {
    throw new AuthorizationError(403, "Collection access denied.");
  }

  return ownedCollection;
}

export async function createCredential(input: CredentialInput) {
  const { session } = await requireWorkspaceMember(input.workspaceId);
  const ownedCollection = await requireCollectionInWorkspace(
    input.workspaceId,
    input.collectionId,
  );

  const name = input.name.trim();
  const type = input.type?.trim() || "generic_secret";
  const provider = input.provider?.trim() || null;
  const exportName = input.exportName?.trim() || null;
  const credentialId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const encrypted = await encryptCredential(credentialId, input.value);

  await db.batch([
    db.insert(credential).values({
      id: credentialId,
      collectionId: input.collectionId,
      name,
      type,
      provider,
      exportName,
      currentVersionId: versionId,
    }),
    db.insert(credentialVersion).values({
      id: versionId,
      credentialId,
      encryptedValue: encrypted.encryptedValue,
      nonce: encrypted.nonce,
      encryptionKeyVersion: encrypted.encryptionKeyVersion,
      createdBy: session.user.id,
      changeReason: input.changeReason?.trim() || null,
    }),
    db.insert(auditEvent).values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      actorUserId: session.user.id,
      action: "credential.created",
      resourceType: "credential",
      resourceId: credentialId,
      environmentId: ownedCollection.environmentId,
      metadata: metadataForCredential({
        name,
        type,
        provider,
        exportName,
        changeReason: input.changeReason,
      }),
    }),
  ]);

  return {
    id: credentialId,
    collectionId: input.collectionId,
    name,
    type,
    provider,
    exportName,
    currentVersionId: versionId,
  };
}

export async function listCredentials(
  workspaceId: string,
  collectionId: string,
) {
  await requireWorkspaceMember(workspaceId);
  await requireCollectionInWorkspace(workspaceId, collectionId);

  return db
    .select({
      id: credential.id,
      collectionId: credential.collectionId,
      name: credential.name,
      type: credential.type,
      provider: credential.provider,
      exportName: credential.exportName,
      currentVersionId: credential.currentVersionId,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    })
    .from(credential)
    .where(eq(credential.collectionId, collectionId))
    .orderBy(desc(credential.createdAt));
}

export async function revealCredential(input: {
  workspaceId: string;
  credentialId: string;
}) {
  const { session } = await requireWorkspaceMember(input.workspaceId);

  const [storedCredential] = await db
    .select({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      provider: credential.provider,
      exportName: credential.exportName,
      environmentId: collection.environmentId,
      encryptedValue: credentialVersion.encryptedValue,
      nonce: credentialVersion.nonce,
      encryptionKeyVersion: credentialVersion.encryptionKeyVersion,
    })
    .from(credential)
    .innerJoin(collection, eq(credential.collectionId, collection.id))
    .innerJoin(
      credentialVersion,
      eq(credential.currentVersionId, credentialVersion.id),
    )
    .where(
      and(
        eq(credential.id, input.credentialId),
        eq(collection.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  if (!storedCredential) {
    throw new AuthorizationError(403, "Credential access denied.");
  }

  const value = await decryptCredential(
    storedCredential.id,
    storedCredential.encryptedValue,
    storedCredential.nonce,
    storedCredential.encryptionKeyVersion,
  );

  await db.insert(auditEvent).values({
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    actorUserId: session.user.id,
    action: "credential.revealed",
    resourceType: "credential",
    resourceId: storedCredential.id,
    environmentId: storedCredential.environmentId,
    metadata: metadataForCredential({
      name: storedCredential.name,
      type: storedCredential.type,
      provider: storedCredential.provider,
      exportName: storedCredential.exportName,
    }),
  });

  return {
    id: storedCredential.id,
    value,
  };
}

export async function rotateCredential(input: RotateCredentialInput) {
  const { session } = await requireWorkspaceMember(input.workspaceId);

  const [existingCredential] = await db
    .select({
      id: credential.id,
      collectionId: credential.collectionId,
      name: credential.name,
      type: credential.type,
      provider: credential.provider,
      exportName: credential.exportName,
      environmentId: collection.environmentId,
    })
    .from(credential)
    .innerJoin(collection, eq(credential.collectionId, collection.id))
    .where(
      and(
        eq(credential.id, input.credentialId),
        eq(collection.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  if (!existingCredential) {
    throw new AuthorizationError(403, "Credential access denied.");
  }

  const versionId = crypto.randomUUID();
  const encrypted = await encryptCredential(
    existingCredential.id,
    input.value,
  );

  await db.batch([
    db.insert(credentialVersion).values({
      id: versionId,
      credentialId: existingCredential.id,
      encryptedValue: encrypted.encryptedValue,
      nonce: encrypted.nonce,
      encryptionKeyVersion: encrypted.encryptionKeyVersion,
      createdBy: session.user.id,
      changeReason: input.changeReason?.trim() || null,
    }),
    db
      .update(credential)
      .set({
        currentVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(eq(credential.id, existingCredential.id)),
    db.insert(auditEvent).values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      actorUserId: session.user.id,
      action: "credential.rotated",
      resourceType: "credential",
      resourceId: existingCredential.id,
      environmentId: existingCredential.environmentId,
      metadata: metadataForCredential({
        name: existingCredential.name,
        type: existingCredential.type,
        provider: existingCredential.provider,
        exportName: existingCredential.exportName,
        changeReason: input.changeReason,
      }),
    }),
  ]);

  return {
    id: existingCredential.id,
    currentVersionId: versionId,
  };
}
