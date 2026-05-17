CREATE INDEX IF NOT EXISTS "orders_delivery_date_idx" ON "orders" ("delivery_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_is_paid_idx" ON "orders" ("status","is_paid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_addons_order_id_idx" ON "order_addons" ("order_id");
