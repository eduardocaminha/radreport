CREATE TYPE "public"."doc_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."template_ownership" AS ENUM('admin', 'user', 'community', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "builder_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "builder_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"template_id" bigint,
	"messages" jsonb,
	"current_step" text,
	"collected_data" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_documents" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "template_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"template_id" bigint,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size_bytes" integer,
	"blob_url" text NOT NULL,
	"processing_status" "doc_processing_status" DEFAULT 'pending' NOT NULL,
	"extracted_content" text,
	"extracted_template" jsonb,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_findings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "template_findings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"template_id" bigint NOT NULL,
	"region_slug" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"keywords" text[] NOT NULL,
	"body_content" text NOT NULL,
	"field_rules" jsonb,
	"measure_default" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_packs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "template_packs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"owner_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"stripe_price_id" text,
	"price_amount_cents" integer,
	"currency" text DEFAULT 'brl',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "template_regions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "template_regions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"template_id" bigint NOT NULL,
	"region_slug" text NOT NULL,
	"region_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"default_normal_text" text,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"owner_clerk_user_id" text NOT NULL,
	"ownership" "template_ownership" DEFAULT 'user' NOT NULL,
	"organization_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"exam_type" text NOT NULL,
	"exam_subtype" text,
	"contrast" text NOT NULL,
	"urgency_default" boolean DEFAULT true NOT NULL,
	"keywords" text[],
	"body_content" text NOT NULL,
	"status" "template_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_template_id" bigint,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"pack_id" bigint,
	"is_free" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"clone_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_template_access" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_template_access_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"template_id" bigint,
	"pack_id" bigint,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" text
);
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "template_id" bigint;--> statement-breakpoint
ALTER TABLE "builder_sessions" ADD CONSTRAINT "builder_sessions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_documents" ADD CONSTRAINT "template_documents_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_findings" ADD CONSTRAINT "template_findings_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_regions" ADD CONSTRAINT "template_regions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_template_access" ADD CONSTRAINT "user_template_access_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_template_access" ADD CONSTRAINT "user_template_access_pack_id_template_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."template_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "builder_sessions_user_idx" ON "builder_sessions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "template_docs_user_idx" ON "template_documents" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "findings_template_idx" ON "template_findings" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "findings_region_idx" ON "template_findings" USING btree ("region_slug");--> statement-breakpoint
CREATE INDEX "template_regions_template_idx" ON "template_regions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "templates_owner_idx" ON "templates" USING btree ("owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "templates_exam_type_idx" ON "templates" USING btree ("exam_type");--> statement-breakpoint
CREATE INDEX "templates_ownership_idx" ON "templates" USING btree ("ownership");--> statement-breakpoint
CREATE INDEX "templates_slug_owner_idx" ON "templates" USING btree ("slug","owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "templates_org_idx" ON "templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_tpl_access_user_idx" ON "user_template_access" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "user_tpl_access_tpl_idx" ON "user_template_access" USING btree ("template_id");