ALTER TABLE "GroupMessage" ADD COLUMN "kind" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "GroupMessage" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "GroupMessage" ADD COLUMN "pinnedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Notification" ADD COLUMN "kind" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "Notification" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Notification" ADD COLUMN "pinnedAt" timestamp;--> statement-breakpoint
CREATE INDEX "GroupMessage_groupId_pinnedAt_idx" ON "GroupMessage" USING btree ("groupId","pinnedAt");--> statement-breakpoint
CREATE INDEX "Notification_userId_pinnedAt_idx" ON "Notification" USING btree ("userId","pinnedAt");