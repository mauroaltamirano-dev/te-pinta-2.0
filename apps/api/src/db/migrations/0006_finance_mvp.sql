CREATE TYPE "public"."finance_base_unit" AS ENUM('unit', 'g', 'kg', 'ml', 'l', 'pack');--> statement-breakpoint
CREATE TYPE "public"."finance_cost_component_type" AS ENUM('base_raw_material', 'packaging');--> statement-breakpoint
CREATE TYPE "public"."finance_cost_rule_applies_to" AS ENUM('per_empanada', 'per_started_dozen');--> statement-breakpoint
CREATE TYPE "public"."finance_product_category" AS ENUM('raw_material', 'packaging', 'operating_expense', 'service', 'fuel', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."finance_rounding_mode" AS ENUM('exact', 'ceil');--> statement-breakpoint
CREATE TYPE "public"."finance_stock_movement_type" AS ENUM('purchase_in', 'manual_in', 'manual_out', 'waste', 'order_consumption', 'adjustment');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cost_total_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gross_profit_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "profit_margin_percent" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cost_snapshot_json" jsonb;--> statement-breakpoint
CREATE TABLE "finance_products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"normalized_name" varchar(180) NOT NULL,
	"category" "finance_product_category" NOT NULL,
	"base_unit" "finance_base_unit" NOT NULL,
	"stock_tracking" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_products_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "finance_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_date" date NOT NULL,
	"supplier" varchar(180),
	"receipt_number" varchar(120),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_purchase_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"product_id" text NOT NULL,
	"purchase_unit" "finance_base_unit" NOT NULL,
	"purchase_quantity" numeric(14, 3) NOT NULL,
	"units_per_package" numeric(14, 3) NOT NULL,
	"total_base_units" numeric(14, 3) NOT NULL,
	"unit_price_cents" integer,
	"total_price_cents" integer NOT NULL,
	"cost_per_base_unit_cents" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"movement_type" "finance_stock_movement_type" NOT NULL,
	"quantity_base" numeric(14, 3) NOT NULL,
	"source_purchase_item_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_base_cost_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" varchar(180) NOT NULL,
	"component_type" "finance_cost_component_type" NOT NULL,
	"applies_to" "finance_cost_rule_applies_to" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"group_size_units" integer DEFAULT 12 NOT NULL,
	"rounding_mode" "finance_rounding_mode" DEFAULT 'ceil' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_recipes" (
	"menu_item_id" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_recipe_items" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_item_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity_per_dozen" numeric(14, 3) NOT NULL,
	"unit" "finance_base_unit" NOT NULL,
	"quantity_base" numeric(14, 3) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_purchase_items" ADD CONSTRAINT "finance_purchase_items_purchase_id_finance_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."finance_purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_purchase_items" ADD CONSTRAINT "finance_purchase_items_product_id_finance_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."finance_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_stock_movements" ADD CONSTRAINT "finance_stock_movements_product_id_finance_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."finance_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_stock_movements" ADD CONSTRAINT "finance_stock_movements_source_purchase_item_id_finance_purchase_items_id_fk" FOREIGN KEY ("source_purchase_item_id") REFERENCES "public"."finance_purchase_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_base_cost_rules" ADD CONSTRAINT "finance_base_cost_rules_product_id_finance_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."finance_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recipes" ADD CONSTRAINT "finance_recipes_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recipe_items" ADD CONSTRAINT "finance_recipe_items_menu_item_id_finance_recipes_menu_item_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."finance_recipes"("menu_item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recipe_items" ADD CONSTRAINT "finance_recipe_items_product_id_finance_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."finance_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_products_category_idx" ON "finance_products" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_products_active_idx" ON "finance_products" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_purchases_purchase_date_idx" ON "finance_purchases" ("purchase_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_purchases_supplier_idx" ON "finance_purchases" ("supplier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_purchase_items_purchase_id_idx" ON "finance_purchase_items" ("purchase_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_purchase_items_product_id_idx" ON "finance_purchase_items" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_stock_movements_product_id_idx" ON "finance_stock_movements" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_stock_movements_source_purchase_item_id_idx" ON "finance_stock_movements" ("source_purchase_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_base_cost_rules_product_id_idx" ON "finance_base_cost_rules" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_base_cost_rules_active_idx" ON "finance_base_cost_rules" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_recipe_items_menu_item_id_idx" ON "finance_recipe_items" ("menu_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_recipe_items_product_id_idx" ON "finance_recipe_items" ("product_id");
