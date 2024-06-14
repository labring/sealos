package dao

import (
	"os"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
)

var (
	CK *cockroach.Cockroach
)

func InitCockroachDB() error {
	var err error
	CK, err = cockroach.NewCockRoach(os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		return err
	}
	return nil
}
