/*
  Warnings:

  - A unique constraint covering the columns `[dodoSubscriptionId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'CANCELED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('CREATOR', 'PRO', 'AGENCY');

-- AlterTable
ALTER TABLE "purchase" ADD COLUMN     "includedInPlan" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "dodoSubscriptionId" TEXT,
ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "planPeriodStart" TIMESTAMP(3),
ADD COLUMN     "planStatus" "PlanStatus",
ADD COLUMN     "planTier" "PlanTier";

-- CreateIndex
CREATE UNIQUE INDEX "user_dodoSubscriptionId_key" ON "user"("dodoSubscriptionId");
