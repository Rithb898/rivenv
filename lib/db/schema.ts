import { defineRelations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspace = sqliteTable(
  "workspace",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("workspace_slug_unique").on(table.slug)],
);

export const workspaceMember = sqliteTable(
  "workspace_member",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] })
          .notNull()
          .default("member"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_member_user_id_idx").on(table.userId),
  ],
);

export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("project_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
  ],
);

export const environment = sqliteTable(
  "environment",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isProtected: integer("is_protected", { mode: "boolean" })
      .default(false)
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("environment_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
  ],
);

export const collection = sqliteTable(
  "collection",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("personal"),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    environmentId: text("environment_id").references(() => environment.id, {
      onDelete: "cascade",
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("collection_workspace_name_unique").on(
      table.workspaceId,
      table.name,
    ),
    index("collection_project_id_idx").on(table.projectId),
    index("collection_environment_id_idx").on(table.environmentId),
  ],
);

export const credential = sqliteTable(
  "credential",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("generic_secret"),
    provider: text("provider"),
    exportName: text("export_name"),
    currentVersionId: text("current_version_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("credential_collection_name_unique").on(
      table.collectionId,
      table.name,
    ),
    uniqueIndex("credential_collection_export_name_unique").on(
      table.collectionId,
      table.exportName,
    ),
    index("credential_collection_id_idx").on(table.collectionId),
  ],
);

export const credentialVersion = sqliteTable(
  "credential_version",
  {
    id: text("id").primaryKey(),
    credentialId: text("credential_id")
      .notNull()
      .references(() => credential.id, { onDelete: "cascade" }),
    encryptedValue: text("encrypted_value").notNull(),
    nonce: text("nonce").notNull(),
    encryptionKeyVersion: integer("encryption_key_version").notNull(),
    valueDigest: text("value_digest"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    changeReason: text("change_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("credential_version_credential_id_idx").on(table.credentialId)],
);

export const auditEvent = sqliteTable(
  "audit_event",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    environmentId: text("environment_id").references(() => environment.id, {
      onDelete: "set null",
    }),
    metadata: text("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("audit_event_workspace_id_idx").on(table.workspaceId),
    index("audit_event_resource_idx").on(
      table.resourceType,
      table.resourceId,
    ),
    index("audit_event_actor_user_id_idx").on(table.actorUserId),
  ],
);


export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    workspace,
    workspaceMember,
    project,
    environment,
    collection,
    credential,
    credentialVersion,
    auditEvent,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      ownedWorkspaces: r.many.workspace(),
      workspaceMemberships: r.many.workspaceMember(),
      createdProjects: r.many.project(),
      createdCollections: r.many.collection(),
      createdCredentialVersions: r.many.credentialVersion(),
      auditEvents: r.many.auditEvent(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    workspace: {
      creator: r.one.user({
        from: r.workspace.createdBy,
        to: r.user.id,
      }),
      members: r.many.workspaceMember(),
      projects: r.many.project(),
      collections: r.many.collection(),
      auditEvents: r.many.auditEvent(),
    },
    workspaceMember: {
      workspace: r.one.workspace({
        from: r.workspaceMember.workspaceId,
        to: r.workspace.id,
      }),
      user: r.one.user({
        from: r.workspaceMember.userId,
        to: r.user.id,
      }),
    },
    project: {
      workspace: r.one.workspace({
        from: r.project.workspaceId,
        to: r.workspace.id,
      }),
      creator: r.one.user({
        from: r.project.createdBy,
        to: r.user.id,
      }),
      environments: r.many.environment(),
      collections: r.many.collection(),
    },
    environment: {
      project: r.one.project({
        from: r.environment.projectId,
        to: r.project.id,
      }),
      collections: r.many.collection(),
      auditEvents: r.many.auditEvent(),
    },
    collection: {
      workspace: r.one.workspace({
        from: r.collection.workspaceId,
        to: r.workspace.id,
      }),
      project: r.one.project({
        from: r.collection.projectId,
        to: r.project.id,
      }),
      environment: r.one.environment({
        from: r.collection.environmentId,
        to: r.environment.id,
      }),
      creator: r.one.user({
        from: r.collection.createdBy,
        to: r.user.id,
      }),
      credentials: r.many.credential(),
    },
    credential: {
      collection: r.one.collection({
        from: r.credential.collectionId,
        to: r.collection.id,
      }),
      versions: r.many.credentialVersion(),
    },
    credentialVersion: {
      credential: r.one.credential({
        from: r.credentialVersion.credentialId,
        to: r.credential.id,
      }),
      creator: r.one.user({
        from: r.credentialVersion.createdBy,
        to: r.user.id,
      }),
    },
    auditEvent: {
      workspace: r.one.workspace({
        from: r.auditEvent.workspaceId,
        to: r.workspace.id,
      }),
      actor: r.one.user({
        from: r.auditEvent.actorUserId,
        to: r.user.id,
      }),
      environment: r.one.environment({
        from: r.auditEvent.environmentId,
        to: r.environment.id,
      }),
    },

  }),
);
