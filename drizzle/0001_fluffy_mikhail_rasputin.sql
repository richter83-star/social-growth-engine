CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`keywords` json NOT NULL,
	`platforms` json NOT NULL,
	`persona` text NOT NULL,
	`playbook` enum('3_day_warmup','direct_negotiator') NOT NULL DEFAULT 'direct_negotiator',
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`targetEngagements` int DEFAULT 50,
	`totalDiscovered` int DEFAULT 0,
	`totalEngaged` int DEFAULT 0,
	`totalApproved` int DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discovered_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('twitter','reddit','linkedin') NOT NULL,
	`threadUrl` text NOT NULL,
	`threadTitle` text NOT NULL,
	`threadContent` text,
	`author` varchar(256),
	`intentScore` float DEFAULT 0,
	`engagementPotential` float DEFAULT 0,
	`status` enum('new','queued','engaged','skipped') NOT NULL DEFAULT 'new',
	`discoveredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discovered_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engagement_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`accountId` int,
	`generatedComment` text NOT NULL,
	`commentTone` varchar(64),
	`confidenceScore` float DEFAULT 0,
	`status` enum('pending','approved','rejected','posted','failed') NOT NULL DEFAULT 'pending',
	`aiReasoning` text,
	`postedAt` timestamp,
	`engagementResult` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `engagement_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`engagementId` int NOT NULL,
	`platform` varchar(32) NOT NULL,
	`commentTone` varchar(64),
	`keywordMatch` varchar(256),
	`likes` int DEFAULT 0,
	`replies` int DEFAULT 0,
	`followersGained` int DEFAULT 0,
	`successScore` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learning_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('high_value_thread','campaign_complete','engagement_posted','system') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int,
	`campaignId` int,
	`date` varchar(10) NOT NULL,
	`followers` int DEFAULT 0,
	`followerDelta` int DEFAULT 0,
	`engagementRate` float DEFAULT 0,
	`impressions` int DEFAULT 0,
	`engagementsCount` int DEFAULT 0,
	`threadsDiscovered` int DEFAULT 0,
	`commentsPosted` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('twitter','reddit','linkedin') NOT NULL,
	`handle` varchar(128) NOT NULL,
	`displayName` varchar(256),
	`avatarUrl` text,
	`encryptedCredentials` text,
	`followers` int DEFAULT 0,
	`following` int DEFAULT 0,
	`engagementRate` float DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSynced` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_accounts_id` PRIMARY KEY(`id`)
);
