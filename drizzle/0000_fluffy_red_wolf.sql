CREATE TYPE "public"."tier" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "audio_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audio_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"report_id" bigint,
	"language" text NOT NULL,
	"duration_seconds" integer,
	"transcript_raw" text,
	"transcript_deltas" jsonb,
	"turn_transcripts" jsonb,
	"audio_file_path" text,
	"audio_format" text,
	"audio_size_bytes" integer,
	"sample_rate" integer,
	"turn_count" integer,
	"word_count" integer,
	"error_occurred" boolean DEFAULT false,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_generations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "report_generations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"report_id" bigint,
	"clerk_user_id" text NOT NULL,
	"input_text_hash" text,
	"input_text_length" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"cost_usd" numeric(10, 6),
	"cost_brl" numeric(10, 6),
	"model" text,
	"generation_duration_ms" integer,
	"mode" text,
	"locale" text,
	"usar_pesquisa" boolean DEFAULT false,
	"template_mascara" text,
	"template_achados" text[],
	"system_prompt_length" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"input_text" text NOT NULL,
	"generated_report" text NOT NULL,
	"mode" text DEFAULT 'ps',
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"cost_brl" numeric(10, 6),
	"cost_usd" numeric(10, 6),
	"model_used" text,
	"locale" text,
	"font_size_idx" integer,
	"generation_duration_ms" integer,
	"usar_pesquisa" boolean DEFAULT false,
	"template_mascara" text,
	"template_achados" text[],
	"audio_session_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"font_size_idx" integer DEFAULT 1 NOT NULL,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"default_report_mode" text DEFAULT 'ps' NOT NULL,
	"usar_pesquisa" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"reports_this_month" integer DEFAULT 0 NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "user_profiles_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "user_profiles_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE INDEX "audio_sessions_user_idx" ON "audio_sessions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "audio_sessions_lang_idx" ON "audio_sessions" USING btree ("language");--> statement-breakpoint
CREATE INDEX "audio_sessions_created_idx" ON "audio_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_gen_user_idx" ON "report_generations" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "report_gen_created_idx" ON "report_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_clerk_user_id_idx" ON "reports" USING btree ("clerk_user_id");