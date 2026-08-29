-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "categoryType" "CategoryType" NOT NULL DEFAULT 'EXPENSE',
    "periodStart" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_userId_periodStart_idx" ON "Budget"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_periodStart_key" ON "Budget"("userId", "categoryId", "periodStart");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_userId_categoryType_fkey" FOREIGN KEY ("categoryId", "userId", "categoryType") REFERENCES "Category"("id", "userId", "type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_period_first_day" CHECK (EXTRACT(DAY FROM "periodStart") = 1);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_category_type_expense" CHECK ("categoryType" = 'EXPENSE'::"CategoryType");
