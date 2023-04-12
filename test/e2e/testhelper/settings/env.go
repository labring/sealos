package settings

import "os"

/*
   need set ALIYUN_REGION_ID, ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET
*/

const (
	Prefix           = "SEALOS_E2E_TEST_"
	DefaultWaiteTime = Prefix + "DEFAULT_WAITE_TIME"
	MaxWaiteTime     = Prefix + "MAX_WAITE_TIME"

	TestImageName      = Prefix + "IMAGE_NAME"
	TestImageTar       = Prefix + "IMAGE_TAR"
	TestPatchImageName = Prefix + "PATCH_IMAGE_NAME"
	TestPatchImageTar  = Prefix + "PATCH_IMAGE_TAR"

	TestInfra         = Prefix + "EST_INFRA"
	TestClusterName   = Prefix + "CLUSTER_NAME"
	TestDir           = Prefix + "TEST_DIR"
	TestSealosBinPath = Prefix + "SEALOS_BIN_PATH"
)

func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
