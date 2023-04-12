package settings

import "os"

/*
   need set ALIYUN_REGION_ID, ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET
*/

const (
	Prefix                             = "SEALOS_E2E_TEST_"
	SEALOS_E2E_TEST_DEFAULT_WAITE_TIME = Prefix + "DEFAULT_WAITE_TIME"
	SEALOS_E2E_TEST_MAX_WAITE_TIME     = Prefix + "MAX_WAITE_TIME"

	SEALOS_E2E_TEST_IMAGE_NAME       = Prefix + "IMAGE_NAME"
	SEALOS_E2E_TEST_IMAGE_TAR        = Prefix + "IMAGE_TAR"
	SEALOS_E2E_TEST_PATCH_IMAGE_NAME = Prefix + "PATCH_IMAGE_NAME"
	SEALOS_E2E_TEST_PATCH_IMAGE_TAR  = Prefix + "PATCH_IMAGE_TAR"

	SEALOS_E2E_TEST_INFRA           = Prefix + "EST_INFRA"
	SEALOS_E2E_TEST_CLUSTER_NAME    = Prefix + "CLUSTER_NAME"
	SEALOS_E2E_TEST_TEST_DIR        = Prefix + "TEST_DIR"
	SEALOS_E2E_TEST_SEALOS_BIN_PATH = Prefix + "SEALOS_BIN_PATH"
)

func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
