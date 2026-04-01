ALTER TABLE `engagement_queue` ADD `editedContent` text;--> statement-breakpoint
ALTER TABLE `engagement_queue` ADD `isEdited` boolean DEFAULT false NOT NULL;