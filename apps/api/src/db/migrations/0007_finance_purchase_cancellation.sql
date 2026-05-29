ALTER TABLE "finance_purchases" ADD COLUMN "canceled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "finance_purchases" ADD COLUMN "canceled_reason" text;
