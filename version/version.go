package version

import (
	"fmt"
	"runtime"
)

var (
	Version   = "latest"
	Build     = ""
	BuildTime = ""
	// VersionStr = fmt.Sprintf("sealos version %v, build %v %v", Version, Build, runtime.Version())
	VersionStr = fmt.Sprintf("sealos version %v, build %v %v, Build Time : %v", Version, Build, runtime.Version(), BuildTime)
)
