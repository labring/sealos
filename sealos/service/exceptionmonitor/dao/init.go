package dao

import (
	"os"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/service/exceptionmonitor/api"
)

var (
	CK *cockroach.Cockroach
)

func InitCockroachDB() error {
	var err error
	os.Setenv("LOCAL_REGION", api.LOCALREGION)

	CK, err = cockroach.NewCockRoach(os.Getenv("GlobalCockroachURI"), os.Getenv("LocalCockroachURI"))
	if err != nil {
		return err
	}
	return nil
}
