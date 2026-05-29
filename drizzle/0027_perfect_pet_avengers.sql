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
ALTER TABLE "AtlasCollectionItem" ADD CONSTRAINT "AtlasCollectionItem_collectionId_AtlasCollection_id_fk" FOREIGN KEY ("collectionId") REFERENCES "public"."AtlasCollection"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AtlasCollection" ADD CONSTRAINT "AtlasCollection_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AtlasCollectionItem_collectionId_idx" ON "AtlasCollectionItem" USING btree ("collectionId");--> statement-breakpoint
CREATE INDEX "AtlasCollectionItem_sourceId_idx" ON "AtlasCollectionItem" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "AtlasCollectionItem_collectionId_sortOrder_idx" ON "AtlasCollectionItem" USING btree ("collectionId","sortOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "AtlasCollection_userId_tag_key" ON "AtlasCollection" USING btree ("userId","tag");--> statement-breakpoint
CREATE UNIQUE INDEX "AtlasCollection_shareSlug_key" ON "AtlasCollection" USING btree ("shareSlug");--> statement-breakpoint
CREATE INDEX "AtlasCollection_userId_idx" ON "AtlasCollection" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AtlasCollection_shareSlug_idx" ON "AtlasCollection" USING btree ("shareSlug");--> statement-breakpoint
CREATE INDEX "AtlasCollection_isPublic_idx" ON "AtlasCollection" USING btree ("isPublic");