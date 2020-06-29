package version

import (
	"fmt"
	"runtime"
)

var (
	Version    = "latest"
	Build      = ""
	Buildstamp = ""
	VersionStr = fmt.Sprintf("sealos version %v, build %v %v, UTC Build Time : %v", Version, Build, runtime.Version(), Buildstamp)
)
