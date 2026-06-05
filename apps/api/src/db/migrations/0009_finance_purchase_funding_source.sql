CREATE TYPE "public"."finance_purchase_funding_source" AS ENUM('production_cost', 'profit', 'services');--> statement-breakpoint
ALTER TABLE "finance_purchases" ADD COLUMN "funding_source" "finance_purchase_funding_source" DEFAULT 'production_cost' NOT NULL;
