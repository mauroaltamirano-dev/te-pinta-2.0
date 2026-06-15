CREATE TYPE "public"."finance_wallet_movement_direction" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TABLE "finance_wallet_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" "finance_purchase_funding_source" NOT NULL,
	"direction" "finance_wallet_movement_direction" NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" varchar(160) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_wallet_adjustments_amount_positive" CHECK ("amount_cents" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_wallet_adjustments_wallet_idx" ON "finance_wallet_adjustments" ("wallet");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_wallet_adjustments_occurred_at_idx" ON "finance_wallet_adjustments" ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_wallet_adjustments_actor_id_idx" ON "finance_wallet_adjustments" ("actor_id");
