CREATE TYPE "public"."finance_reserve_movement_source" AS ENUM('profit', 'external');--> statement-breakpoint
CREATE TYPE "public"."finance_wallet" AS ENUM('production_cost', 'services', 'profit', 'reserve');--> statement-breakpoint
ALTER TYPE "public"."finance_ledger_category" ADD VALUE 'reserve_transfer' BEFORE 'stock_valuation';--> statement-breakpoint
ALTER TYPE "public"."finance_ledger_category" ADD VALUE 'reserve_external_contribution' BEFORE 'stock_valuation';--> statement-breakpoint
ALTER TYPE "public"."finance_ledger_event_type" ADD VALUE 'reserve_transfer' BEFORE 'stock_movement';--> statement-breakpoint
ALTER TYPE "public"."finance_ledger_event_type" ADD VALUE 'reserve_external_contribution' BEFORE 'stock_movement';--> statement-breakpoint
ALTER TYPE "public"."finance_ledger_source_type" ADD VALUE 'reserve_movement' BEFORE 'stock_movement';--> statement-breakpoint
CREATE TABLE "finance_reserve_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "finance_reserve_movement_source" NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text,
	"created_by_name" varchar(160),
	"metadata_json" jsonb,
	CONSTRAINT "finance_reserve_movements_amount_positive" CHECK ("finance_reserve_movements"."amount_cents" > 0),
	CONSTRAINT "finance_reserve_movements_actor_pair" CHECK (("finance_reserve_movements"."created_by_id" IS NULL) = ("finance_reserve_movements"."created_by_name" IS NULL)),
	CONSTRAINT "finance_reserve_movements_metadata_object" CHECK ("finance_reserve_movements"."metadata_json" IS NULL OR jsonb_typeof("finance_reserve_movements"."metadata_json") = 'object')
);
--> statement-breakpoint
ALTER TABLE "finance_ledger_entries" ALTER COLUMN "wallet" SET DATA TYPE "public"."finance_wallet" USING "wallet"::text::"public"."finance_wallet";--> statement-breakpoint
ALTER TABLE "finance_wallet_adjustments" ALTER COLUMN "wallet" SET DATA TYPE "public"."finance_wallet" USING "wallet"::text::"public"."finance_wallet";--> statement-breakpoint
CREATE INDEX "finance_reserve_movements_created_at_idx" ON "finance_reserve_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "finance_reserve_movements_source_idx" ON "finance_reserve_movements" USING btree ("source");