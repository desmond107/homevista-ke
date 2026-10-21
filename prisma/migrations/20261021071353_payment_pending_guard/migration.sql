-- Only one in-flight (PENDING) payment per user, kind and property.
-- This is the database-level guard against double STK pushes / duplicate charges.
CREATE UNIQUE INDEX "Payment_one_pending_per_item"
  ON "Payment" ("userId", "kind", COALESCE("propertyId", ''))
  WHERE "status" = 'PENDING';
