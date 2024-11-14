package common

import (
	"github.com/labring/sealos/service/aiproxy/common/env"
)

var (
	UsingSQLite     = false
	UsingPostgreSQL = false
	UsingMySQL      = false
)

var (
	SQLitePath        = "aiproxy.db"
	SQLiteBusyTimeout = env.Int("SQLITE_BUSY_TIMEOUT", 3000)
)
