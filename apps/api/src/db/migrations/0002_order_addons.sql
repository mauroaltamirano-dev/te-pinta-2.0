CREATE TABLE "order_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"addon_id" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_addons" ADD CONSTRAINT "order_addons_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
