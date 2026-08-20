/*
  Warnings:

  - A unique constraint covering the columns `[source,chunk_index]` on the table `knowledge_base` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "knowledge_base_source_key";

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "sbar_complete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "knowledge_base" ADD COLUMN     "chunk_index" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_source_chunk_index_key" ON "knowledge_base"("source", "chunk_index");
