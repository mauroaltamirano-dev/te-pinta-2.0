CREATE TYPE "public"."finance_ledger_category" AS ENUM('sale', 'purchase', 'wallet_adjustment', 'stock_valuation', 'correction');--> statement-breakpoint
CREATE TYPE "public"."finance_ledger_entry_kind" AS ENUM('income', 'expense', 'adjustment', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."finance_ledger_event_type" AS ENUM('sale_confirmed', 'order_canceled', 'payment_received', 'payment_reversed', 'purchase_recorded', 'purchase_canceled', 'wallet_adjustment', 'stock_movement', 'correction');--> statement-breakpoint
CREATE TYPE "public"."finance_ledger_origin" AS ENUM('live', 'manual', 'backfill', 'system');--> statement-breakpoint
CREATE TYPE "public"."finance_ledger_source_type" AS ENUM('order', 'purchase', 'wallet_adjustment', 'stock_movement');--> statement-breakpoint
CREATE TABLE "finance_ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"line_key" varchar(120) NOT NULL,
	"entry_kind" "finance_ledger_entry_kind" NOT NULL,
	"direction" "finance_wallet_movement_direction" NOT NULL,
	"wallet" "finance_purchase_funding_source",
	"category" "finance_ledger_category" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'ARS' NOT NULL,
	"description" text NOT NULL,
	"reverses_entry_id" text,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_ledger_entries_amount_positive" CHECK ("finance_ledger_entries"."amount_cents" > 0),
	CONSTRAINT "finance_ledger_entries_not_self_reversal" CHECK ("finance_ledger_entries"."reverses_entry_id" IS NULL OR "finance_ledger_entries"."reverses_entry_id" <> "finance_ledger_entries"."id"),
	CONSTRAINT "finance_ledger_entries_metadata_object" CHECK ("finance_ledger_entries"."metadata_json" IS NULL OR jsonb_typeof("finance_ledger_entries"."metadata_json") = 'object')
);
--> statement-breakpoint
CREATE TABLE "finance_ledger_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" "finance_ledger_event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"origin" "finance_ledger_origin" NOT NULL,
	"source_type" "finance_ledger_source_type" NOT NULL,
	"source_id" text NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"created_by_id" text,
	"created_by_name" varchar(160),
	"reverses_event_id" text,
	"metadata_json" jsonb,
	CONSTRAINT "finance_ledger_events_actor_pair" CHECK (("finance_ledger_events"."created_by_id" IS NULL) = ("finance_ledger_events"."created_by_name" IS NULL)),
	CONSTRAINT "finance_ledger_events_metadata_object" CHECK ("finance_ledger_events"."metadata_json" IS NULL OR jsonb_typeof("finance_ledger_events"."metadata_json") = 'object')
);
--> statement-breakpoint
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_event_fk" FOREIGN KEY ("event_id") REFERENCES "public"."finance_ledger_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_reverses_entry_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."finance_ledger_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_ledger_events" ADD CONSTRAINT "finance_ledger_events_reverses_event_fk" FOREIGN KEY ("reverses_event_id") REFERENCES "public"."finance_ledger_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finance_ledger_entries_event_line_unique" ON "finance_ledger_entries" USING btree ("event_id","line_key");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_ledger_entries_reverses_entry_unique" ON "finance_ledger_entries" USING btree ("reverses_entry_id") WHERE "finance_ledger_entries"."reverses_entry_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "finance_ledger_entries_event_id_idx" ON "finance_ledger_entries" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "finance_ledger_entries_wallet_idx" ON "finance_ledger_entries" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "finance_ledger_entries_category_idx" ON "finance_ledger_entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "finance_ledger_entries_created_at_idx" ON "finance_ledger_entries" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_ledger_events_idempotency_key_unique" ON "finance_ledger_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "finance_ledger_events_source_idx" ON "finance_ledger_events" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "finance_ledger_events_occurred_at_idx" ON "finance_ledger_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "finance_ledger_events_event_type_idx" ON "finance_ledger_events" USING btree ("event_type");--> statement-breakpoint
CREATE FUNCTION "reject_finance_ledger_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'finance ledger is append-only: % on % is not allowed', TG_OP, TG_TABLE_NAME
		USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "finance_ledger_events_append_only"
BEFORE UPDATE OR DELETE ON "finance_ledger_events"
FOR EACH ROW EXECUTE FUNCTION "reject_finance_ledger_mutation"();--> statement-breakpoint
CREATE TRIGGER "finance_ledger_entries_append_only"
BEFORE UPDATE OR DELETE ON "finance_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION "reject_finance_ledger_mutation"();
