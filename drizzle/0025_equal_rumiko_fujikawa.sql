ALTER TABLE "User" ADD COLUMN "disabledAt" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "disabledReason" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "disabledById" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "lockoutClearedAt" timestamp;--> statement-breakpoint
UPDATE "AppRole"
SET "permissions" = ("permissions" - 'admin.dataStudio.read' - 'admin.dataStudio.write')::jsonb,
    "updatedAt" = now()
WHERE "id" = 'ADMIN';--> statement-breakpoint
UPDATE "AppRole"
SET "permissions" = (
  CASE
    WHEN "permissions" ? 'admin.users.manageStatus' THEN "permissions"
    ELSE "permissions" || '["admin.users.manageStatus"]'::jsonb
  END
)::jsonb,
    "updatedAt" = now()
WHERE "id" = 'SUPERADMIN';
