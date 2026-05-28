CREATE TABLE "AppRole" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "AppRole" ("id", "label", "description", "permissions") VALUES
	('USER', 'User', 'Standard signed-in user access.', '["dashboard.view","account.updateOwnEmail","account.deleteOwn","notifications.readOwn","profile.editOwn","profile.manageOwnImage","profile.manageOwnTags","profile.manageOwnSearchVisibility","profile.manageOwnFollowerVisibility","profile.follow","profile.block","workspace.access"]'::jsonb),
	('MANAGER', 'Manager', 'Standard user permissions with a separate role assignment tier.', '["dashboard.view","account.updateOwnEmail","account.deleteOwn","notifications.readOwn","profile.editOwn","profile.manageOwnImage","profile.manageOwnTags","profile.manageOwnSearchVisibility","profile.manageOwnFollowerVisibility","profile.follow","profile.block","workspace.access"]'::jsonb),
	('ADMIN', 'Admin', 'Administrative access without role editing privileges.', '["dashboard.view","account.updateOwnEmail","account.deleteOwn","notifications.readOwn","profile.editOwn","profile.manageOwnImage","profile.manageOwnTags","profile.manageOwnSearchVisibility","profile.manageOwnFollowerVisibility","profile.follow","profile.block","workspace.access","workspace.dataEntry.write","admin.access","admin.content.read","admin.content.edit","admin.reports.read","admin.reports.export","admin.users.read","admin.users.notify","admin.roles.read","admin.systemSettings.read","admin.systemSettings.edit","admin.dataStudio.read","admin.dataStudio.write"]'::jsonb),
	('SUPERADMIN', 'Superadmin', 'Full administrative access including role editing.', '["dashboard.view","account.updateOwnEmail","account.deleteOwn","notifications.readOwn","profile.editOwn","profile.manageOwnImage","profile.manageOwnTags","profile.manageOwnSearchVisibility","profile.manageOwnFollowerVisibility","profile.follow","profile.block","workspace.access","workspace.dataEntry.write","admin.access","admin.content.read","admin.content.edit","admin.reports.read","admin.reports.export","admin.users.read","admin.users.notify","admin.roles.read","admin.roles.edit","admin.systemSettings.read","admin.systemSettings.edit","admin.dataStudio.read","admin.dataStudio.write"]'::jsonb);
--> statement-breakpoint
CREATE TABLE "UserRole" (
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserRole_pkey" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_AppRole_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."AppRole"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "UserRole_userId_idx" ON "UserRole" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserRole_roleId_idx" ON "UserRole" USING btree ("roleId");
--> statement-breakpoint
INSERT INTO "UserRole" ("userId", "roleId")
	SELECT "id", "role"::text FROM "User"
	ON CONFLICT DO NOTHING;
