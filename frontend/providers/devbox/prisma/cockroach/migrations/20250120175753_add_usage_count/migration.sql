-- Add usage count field to TemplateRepository
ALTER TABLE "TemplateRepository" ADD COLUMN "usageCount" INT4 NOT NULL DEFAULT 0;

-- Create index on usageCount for better query performance
CREATE INDEX "TemplateRepository_isDeleted_usageCount_idx" ON "TemplateRepository"("isDeleted", "usageCount");
