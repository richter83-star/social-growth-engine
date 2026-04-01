CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`memberId` int NOT NULL,
	`memberEmail` varchar(320) NOT NULL,
	`memberName` varchar(256),
	`teamRole` enum('owner','editor','reviewer','viewer') NOT NULL DEFAULT 'viewer',
	`permissions` json NOT NULL,
	`inviteToken` varchar(128),
	`inviteAccepted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
