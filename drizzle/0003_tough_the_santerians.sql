ALTER TABLE "orders" ADD COLUMN "request_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_request_key" ON "orders" USING btree ("business_id","request_id");