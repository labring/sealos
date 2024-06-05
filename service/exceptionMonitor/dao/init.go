package dao

import (
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	_ "github.com/labring/sealos/service/account/dao"
	"os"
)

var (
	CK *cockroach.Cockroach
)

func InitCockroachDB() error {
	var err error
	CK, err = cockroach.NewCockRoach(os.Getenv(database.GlobalCockroachURI), os.Getenv(database.LocalCockroachURI))
	if err != nil {
		return err
	}
	return nil
}
