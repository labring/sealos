package version

import (
	"fmt"
	"runtime"
)

var (
	Version    = "latest"
	Build      = ""
	VersionStr = fmt.Sprintf("sealos version %v, build %v %v", Version, Build, runtime.Version())
)
