package dao

import (
	"fmt"
	"os"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
)

var (
	CK *cockroach.Cockroach
)

func InitCockroachDB() error {
	var err error
	os.Setenv("LOCAL_REGION", "6a216614-e658-4482-a244-e4311390715f")
	CK, err = cockroach.NewCockRoach(os.Getenv("GlobalCockroachURI"), os.Getenv("LocalCockroachURI"))
	fmt.Println(os.Getenv("GlobalCockroachURI"), os.Getenv("LocalCockroachURI"))
	if err != nil {
		return err
	}
	return nil
}
