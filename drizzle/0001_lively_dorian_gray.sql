CREATE TYPE "public"."payment_method" AS ENUM('tunai', 'transfer', 'qris');--> statement-breakpoint
DROP INDEX "products_business_name_key";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "method" "payment_method";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "messages_business_external_idx" ON "messages" USING btree ("business_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_business_name_key" ON "products" USING btree ("business_id",lower("name")) WHERE "products"."archived_at" is null;