CREATE TYPE "public"."FollowerVisibility" AS ENUM('PUBLIC', 'MEMBERS', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."GroupInvitationStatus" AS ENUM('pending', 'accepted', 'declined', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."GroupMemberRole" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."GroupVisibility" AS ENUM('PUBLIC', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."JobOutboxStatus" AS ENUM('pending', 'running', 'retrying', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."NotificationAudience" AS ENUM('user', 'role', 'all');--> statement-breakpoint
CREATE TYPE "public"."NotificationStatus" AS ENUM('unread', 'read');--> statement-breakpoint
CREATE TYPE "public"."ProblemReportStatus" AS ENUM('open', 'triaged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('SUPERADMIN', 'ADMIN', 'MANAGER', 'USER');--> statement-breakpoint
CREATE TYPE "public"."SiteAnnouncementStatus" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "Account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "Account_pkey" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "AppRole" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AtlasCollectionItem" (
	"collectionId" text NOT NULL,
	"sourceId" text NOT NULL,
	"note" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AtlasCollectionItem_pkey" PRIMARY KEY("collectionId","sourceId")
);
--> statement-breakpoint
CREATE TABLE "AtlasCollection" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"tag" text NOT NULL,
	"notes" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"shareSlug" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AtlasSourceTag" (
	"userId" text NOT NULL,
	"sourceId" text NOT NULL,
	"tag" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AtlasSourceTag_pkey" PRIMARY KEY("userId","sourceId","tag")
);
--> statement-breakpoint
CREATE TABLE "BlogPost" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"clientRequestId" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FeatureFlag" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" integer DEFAULT 0 NOT NULL,
	"description" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "GroupMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"senderUserId" text NOT NULL,
	"body" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pinnedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" "GroupVisibility" DEFAULT 'PRIVATE' NOT NULL,
	"ownerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "JobOutbox" (
	"id" text PRIMARY KEY NOT NULL,
	"jobName" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "JobOutboxStatus" DEFAULT 'pending' NOT NULL,
	"runAt" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"lockedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "NewsletterSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"source" text DEFAULT 'communication-page' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"actorId" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pinnedAt" timestamp,
	"href" text,
	"status" "NotificationStatus" DEFAULT 'unread' NOT NULL,
	"audience" "NotificationAudience" DEFAULT 'user' NOT NULL,
	"audienceValue" text,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PageVisitQueryParameter" (
	"id" text PRIMARY KEY NOT NULL,
	"pageVisitId" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PageVisit" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"trackingVersion" integer DEFAULT 2 NOT NULL,
	"visitorId" text NOT NULL,
	"sessionId" text NOT NULL,
	"href" text NOT NULL,
	"pathname" text NOT NULL,
	"canonicalPath" text NOT NULL,
	"routeGroup" text NOT NULL,
	"isAuthenticated" boolean DEFAULT false NOT NULL,
	"previousPathname" text,
	"previousCanonicalPath" text,
	"referrerType" text DEFAULT 'direct' NOT NULL,
	"referrerHost" text,
	"visitedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProblemReport" (
	"id" text PRIMARY KEY NOT NULL,
	"referenceId" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"area" text NOT NULL,
	"pageUrl" text,
	"subject" text NOT NULL,
	"details" text NOT NULL,
	"status" "ProblemReportStatus" DEFAULT 'open' NOT NULL,
	"adminNote" text,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Profile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"bio" text,
	"locale" text,
	"timezone" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SecurityAuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"actorId" text,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"statusCode" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SecurityRateLimitCounter" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"resetAt" timestamp NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SiteAnnouncement" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"status" "SiteAnnouncementStatus" DEFAULT 'draft' NOT NULL,
	"publishAt" timestamp,
	"unpublishAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SiteSetting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserBlock" (
	"blockerId" text NOT NULL,
	"blockedId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserBlock_pkey" PRIMARY KEY("blockerId","blockedId")
);
--> statement-breakpoint
CREATE TABLE "UserFeatureOverride" (
	"userId" text NOT NULL,
	"featureKey" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserFeatureOverride_pkey" PRIMARY KEY("userId","featureKey")
);
--> statement-breakpoint
CREATE TABLE "UserFollow" (
	"followerId" text NOT NULL,
	"followingId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserFollow_pkey" PRIMARY KEY("followerId","followingId")
);
--> statement-breakpoint
CREATE TABLE "UserRole" (
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserRole_pkey" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"tag" text NOT NULL,
	"name" text,
	"image" text,
	"bannerImage" text,
	"emailVerified" timestamp,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"isSearchable" boolean DEFAULT true NOT NULL,
	"followerVisibility" "FollowerVisibility" DEFAULT 'PUBLIC' NOT NULL,
	"passwordHash" text,
	"failedSignInAttempts" integer DEFAULT 0 NOT NULL,
	"lockoutUntil" timestamp,
	"disabledAt" timestamp,
	"disabledReason" text,
	"disabledById" text,
	"lockoutClearedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "VerificationToken_pkey" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AtlasCollectionItem" ADD CONSTRAINT "AtlasCollectionItem_collectionId_AtlasCollection_id_fk" FOREIGN KEY ("collectionId") REFERENCES "public"."AtlasCollection"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AtlasCollection" ADD CONSTRAINT "AtlasCollection_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AtlasSourceTag" ADD CONSTRAINT "AtlasSourceTag_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_Group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedUserId_User_id_fk" FOREIGN KEY ("invitedUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedByUserId_User_id_fk" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_Group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_groupId_Group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_senderUserId_User_id_fk" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_User_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PageVisitQueryParameter" ADD CONSTRAINT "PageVisitQueryParameter_pageVisitId_PageVisit_id_fk" FOREIGN KEY ("pageVisitId") REFERENCES "public"."PageVisit"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD CONSTRAINT "PageVisit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_User_id_fk" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_User_id_fk" FOREIGN KEY ("blockedId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserFeatureOverride" ADD CONSTRAINT "UserFeatureOverride_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_User_id_fk" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_User_id_fk" FOREIGN KEY ("followingId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_AppRole_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."AppRole"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Account_userId_idx" ON "Account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AtlasCollectionItem_collectionId_idx" ON "AtlasCollectionItem" USING btree ("collectionId");--> statement-breakpoint
CREATE INDEX "AtlasCollectionItem_sourceId_idx" ON "AtlasCollectionItem" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "AtlasCollectionItem_collectionId_sortOrder_idx" ON "AtlasCollectionItem" USING btree ("collectionId","sortOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "AtlasCollection_userId_tag_key" ON "AtlasCollection" USING btree ("userId","tag");--> statement-breakpoint
CREATE UNIQUE INDEX "AtlasCollection_shareSlug_key" ON "AtlasCollection" USING btree ("shareSlug");--> statement-breakpoint
CREATE INDEX "AtlasCollection_userId_idx" ON "AtlasCollection" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AtlasCollection_shareSlug_idx" ON "AtlasCollection" USING btree ("shareSlug");--> statement-breakpoint
CREATE INDEX "AtlasCollection_isPublic_idx" ON "AtlasCollection" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX "AtlasSourceTag_userId_idx" ON "AtlasSourceTag" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AtlasSourceTag_sourceId_idx" ON "AtlasSourceTag" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "AtlasSourceTag_userId_sourceId_idx" ON "AtlasSourceTag" USING btree ("userId","sourceId");--> statement-breakpoint
CREATE UNIQUE INDEX "BlogPost_userId_clientRequestId_key" ON "BlogPost" USING btree ("userId","clientRequestId");--> statement-breakpoint
CREATE INDEX "BlogPost_userId_createdAt_idx" ON "BlogPost" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "BlogPost_userId_updatedAt_idx" ON "BlogPost" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "GroupInvitation_groupId_status_idx" ON "GroupInvitation" USING btree ("groupId","status");--> statement-breakpoint
CREATE INDEX "GroupInvitation_invitedUserId_status_idx" ON "GroupInvitation" USING btree ("invitedUserId","status");--> statement-breakpoint
CREATE INDEX "GroupInvitation_invitedByUserId_idx" ON "GroupInvitation" USING btree ("invitedByUserId");--> statement-breakpoint
CREATE INDEX "GroupMembership_groupId_role_idx" ON "GroupMembership" USING btree ("groupId","role");--> statement-breakpoint
CREATE INDEX "GroupMembership_userId_idx" ON "GroupMembership" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "GroupMessage" USING btree ("groupId","createdAt");--> statement-breakpoint
CREATE INDEX "GroupMessage_groupId_pinnedAt_idx" ON "GroupMessage" USING btree ("groupId","pinnedAt");--> statement-breakpoint
CREATE INDEX "GroupMessage_senderUserId_idx" ON "GroupMessage" USING btree ("senderUserId");--> statement-breakpoint
CREATE INDEX "Group_ownerId_idx" ON "Group" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "Group_name_idx" ON "Group" USING btree ("name");--> statement-breakpoint
CREATE INDEX "Group_visibility_idx" ON "Group" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "JobOutbox_status_runAt_idx" ON "JobOutbox" USING btree ("status","runAt");--> statement-breakpoint
CREATE INDEX "JobOutbox_jobName_idx" ON "JobOutbox" USING btree ("jobName");--> statement-breakpoint
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription" USING btree ("email");--> statement-breakpoint
CREATE INDEX "NewsletterSubscription_locale_idx" ON "NewsletterSubscription" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "Notification_userId_status_idx" ON "Notification" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "Notification_userId_pinnedAt_idx" ON "Notification" USING btree ("userId","pinnedAt");--> statement-breakpoint
CREATE INDEX "Notification_actorId_idx" ON "Notification" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "Notification_audience_idx" ON "Notification" USING btree ("audience","audienceValue");--> statement-breakpoint
CREATE INDEX "PageVisitQueryParameter_pageVisitId_idx" ON "PageVisitQueryParameter" USING btree ("pageVisitId");--> statement-breakpoint
CREATE INDEX "PageVisitQueryParameter_key_idx" ON "PageVisitQueryParameter" USING btree ("key");--> statement-breakpoint
CREATE INDEX "PageVisitQueryParameter_key_value_idx" ON "PageVisitQueryParameter" USING btree ("key","value");--> statement-breakpoint
CREATE INDEX "PageVisit_userId_visitedAt_idx" ON "PageVisit" USING btree ("userId","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_sessionId_visitedAt_idx" ON "PageVisit" USING btree ("sessionId","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_visitorId_visitedAt_idx" ON "PageVisit" USING btree ("visitorId","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_canonicalPath_visitedAt_idx" ON "PageVisit" USING btree ("canonicalPath","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_previousCanonicalPath_visitedAt_idx" ON "PageVisit" USING btree ("previousCanonicalPath","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_routeGroup_visitedAt_idx" ON "PageVisit" USING btree ("routeGroup","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_isAuthenticated_visitedAt_idx" ON "PageVisit" USING btree ("isAuthenticated","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_pathname_idx" ON "PageVisit" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "PageVisit_visitedAt_idx" ON "PageVisit" USING btree ("visitedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "ProblemReport_referenceId_key" ON "ProblemReport" USING btree ("referenceId");--> statement-breakpoint
CREATE INDEX "ProblemReport_status_createdAt_idx" ON "ProblemReport" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "ProblemReport_area_idx" ON "ProblemReport" USING btree ("area");--> statement-breakpoint
CREATE INDEX "ProblemReport_email_idx" ON "ProblemReport" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "SecurityAuditLog_actorId_idx" ON "SecurityAuditLog" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "SecurityAuditLog_action_idx" ON "SecurityAuditLog" USING btree ("action");--> statement-breakpoint
CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "SiteAnnouncement_locale_status_idx" ON "SiteAnnouncement" USING btree ("locale","status");--> statement-breakpoint
CREATE INDEX "SiteAnnouncement_publishAt_idx" ON "SiteAnnouncement" USING btree ("publishAt");--> statement-breakpoint
CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock" USING btree ("blockerId");--> statement-breakpoint
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock" USING btree ("blockedId");--> statement-breakpoint
CREATE INDEX "UserFeatureOverride_userId_idx" ON "UserFeatureOverride" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserFeatureOverride_featureKey_idx" ON "UserFeatureOverride" USING btree ("featureKey");--> statement-breakpoint
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow" USING btree ("followerId");--> statement-breakpoint
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow" USING btree ("followingId");--> statement-breakpoint
CREATE INDEX "UserRole_userId_idx" ON "UserRole" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserRole_roleId_idx" ON "UserRole" USING btree ("roleId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "User_tag_key" ON "User" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "User_email_idx" ON "User" USING btree ("email");--> statement-breakpoint
CREATE INDEX "User_tag_idx" ON "User" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "User_role_idx" ON "User" USING btree ("role");--> statement-breakpoint
CREATE INDEX "User_isSearchable_idx" ON "User" USING btree ("isSearchable");--> statement-breakpoint
CREATE INDEX "User_followerVisibility_idx" ON "User" USING btree ("followerVisibility");--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken" USING btree ("token");