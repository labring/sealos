ALTER DATABASE "sealos-desktop" SET PRIMARY REGION "us-east1";
ALTER DATABASE "sealos-desktop" ADD region "us-west1";
ALTER DATABASE "sealos-desktop" ADD region "europe-west1";
ALTER TABLE "RegionUser" SET LOCALITY REGIONAL BY ROW;
ALTER TABLE "RegionUserToWorkspace" SET LOCALITY REGIONAL BY ROW;
ALTER TABLE "Workspace" SET LOCALITY REGIONAL BY ROW;
ALTER TABLE "OauthProvider" SET LOCALITY GLOBAL;
ALTER TABLE "RegionUser" SET LOCALITY GLOBAL;
ALTER TABLE "Region" SET LOCALITY GLOBAL;
insert into "Region" (uid, "displayName", location, "utcDelta", "domain")
values ('b7c94022-6f17-4252-bf24-b937108712a5', 'home', 'us-west1', 8, 'localhost');
