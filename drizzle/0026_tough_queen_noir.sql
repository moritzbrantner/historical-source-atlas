CREATE TABLE "AtlasSourceTag" (
	"userId" text NOT NULL,
	"sourceId" text NOT NULL,
	"tag" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AtlasSourceTag_pkey" PRIMARY KEY("userId","sourceId","tag")
);
--> statement-breakpoint
ALTER TABLE "AtlasSourceTag" ADD CONSTRAINT "AtlasSourceTag_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AtlasSourceTag_userId_idx" ON "AtlasSourceTag" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AtlasSourceTag_sourceId_idx" ON "AtlasSourceTag" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "AtlasSourceTag_userId_sourceId_idx" ON "AtlasSourceTag" USING btree ("userId","sourceId");