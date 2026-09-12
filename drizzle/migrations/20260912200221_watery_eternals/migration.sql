CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`environment_id` text,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_audit_event_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_audit_event_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_audit_event_environment_id_environment_id_fk` FOREIGN KEY (`environment_id`) REFERENCES `environment`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `collection` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'personal' NOT NULL,
	`project_id` text,
	`environment_id` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_collection_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_collection_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_collection_environment_id_environment_id_fk` FOREIGN KEY (`environment_id`) REFERENCES `environment`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_collection_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `credential` (
	`id` text PRIMARY KEY,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'generic_secret' NOT NULL,
	`provider` text,
	`export_name` text,
	`current_version_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_credential_collection_id_collection_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `credential_version` (
	`id` text PRIMARY KEY,
	`credential_id` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`nonce` text NOT NULL,
	`encryption_key_version` integer NOT NULL,
	`value_digest` text,
	`created_by` text NOT NULL,
	`change_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_credential_version_credential_id_credential_id_fk` FOREIGN KEY (`credential_id`) REFERENCES `credential`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_credential_version_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `environment` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_protected` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`archived_at` integer,
	CONSTRAINT `fk_environment_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`archived_at` integer,
	CONSTRAINT `fk_project_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_project_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_workspace_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workspace_member` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `workspace_member_pk` PRIMARY KEY(`workspace_id`, `user_id`),
	CONSTRAINT `fk_workspace_member_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_workspace_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `audit_event_workspace_id_idx` ON `audit_event` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `audit_event_resource_idx` ON `audit_event` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_event_actor_user_id_idx` ON `audit_event` (`actor_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `collection_workspace_name_unique` ON `collection` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `collection_project_id_idx` ON `collection` (`project_id`);--> statement-breakpoint
CREATE INDEX `collection_environment_id_idx` ON `collection` (`environment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credential_collection_name_unique` ON `credential` (`collection_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `credential_collection_export_name_unique` ON `credential` (`collection_id`,`export_name`);--> statement-breakpoint
CREATE INDEX `credential_collection_id_idx` ON `credential` (`collection_id`);--> statement-breakpoint
CREATE INDEX `credential_version_credential_id_idx` ON `credential_version` (`credential_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `environment_project_slug_unique` ON `environment` (`project_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_workspace_slug_unique` ON `project` (`workspace_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_slug_unique` ON `workspace` (`slug`);--> statement-breakpoint
CREATE INDEX `workspace_member_user_id_idx` ON `workspace_member` (`user_id`);