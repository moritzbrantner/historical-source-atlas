CREATE TYPE "public"."GroupVisibility" AS ENUM('PUBLIC', 'PRIVATE');--> statement-breakpoint
ALTER TABLE "Group" ADD COLUMN "visibility" "GroupVisibility" DEFAULT 'PRIVATE' NOT NULL;--> statement-breakpoint
CREATE INDEX "Group_visibility_idx" ON "Group" USING btree ("visibility");