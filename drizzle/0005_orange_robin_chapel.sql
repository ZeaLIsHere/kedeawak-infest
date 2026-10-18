CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'gold');--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_expires_at" timestamp with time zone;