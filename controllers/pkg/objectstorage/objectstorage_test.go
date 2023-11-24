package objectstorage

import (
	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"
	"os"
	"strconv"
	"testing"
)

func TestGetUserObjectStorageFlow(t *testing.T) {
	cli, err := objectstoragev1.NewOSClient(os.Getenv("MINIO_ENDPOINT"), os.Getenv("MINIO_ACCESS_KEY"), os.Getenv("MINIO_SECRET_KEY"))
	if err != nil {
		t.Error(err)
	}
	bytes, err := GetUserObjectStorageFlow(cli, os.Getenv("PROM_URL"), os.Getenv("MINIO_USERNAME"))
	if err != nil {
		t.Error(err)
	}
	t.Log(ConvertBytes(bytes))
}

func ConvertBytes(bytes int64) string {
	if bytes < 1024 {
		return strconv.FormatInt(bytes, 10) + "B"
	} else if bytes < 1024*1024 {
		return strconv.FormatFloat(float64(bytes)/1024, 'f', 2, 64) + "KB"
	} else if bytes < 1024*1024*1024 {
		return strconv.FormatFloat(float64(bytes)/1024/1024, 'f', 2, 64) + "MB"
	} else {
		return strconv.FormatFloat(float64(bytes)/1024/1024/1024, 'f', 2, 64) + "GB"
	}
}
