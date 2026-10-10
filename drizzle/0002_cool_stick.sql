CREATE TABLE `gym_login_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`customer_id` text,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_account_email_role` ON `gym_login_accounts` (`role`,`email`);--> statement-breakpoint
CREATE INDEX `idx_account_owner` ON `gym_login_accounts` (`owner_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `gym_auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gym_login_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `gym_login_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_session_account` ON `gym_login_sessions` (`account_id`);--> statement-breakpoint
CREATE TABLE `gym_workspace_records` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`customer_phone` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_kind` ON `gym_workspace_records` (`owner_id`,`kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_phone` ON `gym_workspace_records` (`owner_id`,`customer_phone`);--> statement-breakpoint
DROP TABLE `gym_records`;