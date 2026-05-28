CREATE TYPE "public"."GroupInvitationStatus" AS ENUM('pending', 'accepted', 'declined', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."GroupMemberRole" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TABLE "GroupInvitation" (
	"id" text PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"invitedUserId" text NOT NULL,
	"invitedByUserId" text NOT NULL,
	"status" "GroupInvitationStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"respondedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "GroupMembership" (
	"groupId" text NOT NULL,
	"userId" text NOT NULL,
	"role" "GroupMemberRole" DEFAULT 'MEMBER' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "GroupMembership_pkey" PRIMARY KEY("groupId","userId")
);
--> statement-breakpoint
CREATE TABLE "Group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ownerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_Group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedUserId_User_id_fk" FOREIGN KEY ("invitedUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedByUserId_User_id_fk" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_Group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "GroupInvitation_groupId_status_idx" ON "GroupInvitation" USING btree ("groupId","status");--> statement-breakpoint
CREATE INDEX "GroupInvitation_invitedUserId_status_idx" ON "GroupInvitation" USING btree ("invitedUserId","status");--> statement-breakpoint
CREATE INDEX "GroupInvitation_invitedByUserId_idx" ON "GroupInvitation" USING btree ("invitedByUserId");--> statement-breakpoint
CREATE INDEX "GroupMembership_groupId_role_idx" ON "GroupMembership" USING btree ("groupId","role");--> statement-breakpoint
CREATE INDEX "GroupMembership_userId_idx" ON "GroupMembership" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Group_ownerId_idx" ON "Group" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "Group_name_idx" ON "Group" USING btree ("name");