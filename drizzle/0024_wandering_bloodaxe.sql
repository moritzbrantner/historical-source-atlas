CREATE TYPE "public"."ProblemReportStatus" AS ENUM('open', 'triaged', 'closed');--> statement-breakpoint
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
CREATE UNIQUE INDEX "ProblemReport_referenceId_key" ON "ProblemReport" USING btree ("referenceId");--> statement-breakpoint
CREATE INDEX "ProblemReport_status_createdAt_idx" ON "ProblemReport" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "ProblemReport_area_idx" ON "ProblemReport" USING btree ("area");--> statement-breakpoint
CREATE INDEX "ProblemReport_email_idx" ON "ProblemReport" USING btree ("email");