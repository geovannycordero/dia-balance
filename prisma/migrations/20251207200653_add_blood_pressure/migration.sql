/*
  Warnings:

  - You are about to drop the column `preferences` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'BLOOD_PRESSURE';

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "bloodPressureDiastolic" DOUBLE PRECISION,
ADD COLUMN     "bloodPressureSystolic" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "preferences";
