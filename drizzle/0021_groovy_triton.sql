CREATE TABLE "GroupMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"senderUserId" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_groupId_Group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_senderUserId_User_id_fk" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "GroupMessage" USING btree ("groupId","createdAt");--> statement-breakpoint
CREATE INDEX "GroupMessage_senderUserId_idx" ON "GroupMessage" USING btree ("senderUserId");