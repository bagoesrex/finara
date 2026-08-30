-- CreateTable
CREATE TABLE "AiRateLimit" (
    "userId" UUID NOT NULL,
    "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AiRateLimit_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AiRateLimit" ADD CONSTRAINT "AiRateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "AiRateLimit" ADD CONSTRAINT "AiRateLimit_request_count_positive" CHECK ("requestCount" > 0);
