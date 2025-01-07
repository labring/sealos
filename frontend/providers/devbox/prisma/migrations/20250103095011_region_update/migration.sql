-- upgrade region  
-- DropIndex  
DROP INDEX "TemplateRepository_isDeleted_name_key";  

-- add regionUid column
ALTER TABLE "TemplateRepository"  
    ADD COLUMN "regionUid" STRING NOT NULL default '00000000-0000-0000-0000-000000000000';  
ALTER TABLE "TemplateRepository"  
    ALTER COLUMN "regionUid" DROP DEFAULT;  

-- CreateIndex  
CREATE INDEX "TemplateRepository_isDeleted_createdAt_idx" ON "TemplateRepository" ("isDeleted", "createdAt");  

-- CreateIndex  
CREATE UNIQUE INDEX "TemplateRepository_isDeleted_regionUid_name_key" ON "TemplateRepository" ("isDeleted", "regionUid", "name");  

SET enable_experimental_alter_column_type_general = true;  
-- AlterTable  
ALTER TABLE public."TemplateRepository" alter column "organizationUid" type uuid using "organizationUid"::uuid;  
-- AlterTable  
DROP INDEX "Template_isDeleted_templateRepositoryUid_name_key";  
ALTER TABLE "Template" ALTER COLUMN "templateRepositoryUid" type uuid using "templateRepositoryUid"::uuid;  
CREATE UNIQUE INDEX "Template_isDeleted_templateRepositoryUid_name_key" ON "Template" ("isDeleted", "templateRepositoryUid", "name");  
SET enable_experimental_alter_column_type_general = false;