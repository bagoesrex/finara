-- Transaction direction is represented exclusively by type.
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_amount_positive"
CHECK ("amount" > 0);

-- Descriptions must contain user-visible text after trimming whitespace.
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_description_nonempty"
CHECK (length(btrim("description")) > 0);
