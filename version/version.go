package version

import (
	"fmt"
	"runtime"
	"time"
)

var (
	Version   = "latest"
	Build     = ""
	BuildTime = ""
	// VersionStr = fmt.Sprintf("sealos version %v, build %v %v", Version, Build, runtime.Version())
	VersionStr = fmt.Sprintf("sealos version %v, build %v %v, Build Time : %v", Version, Build, runtime.Version(), TimeStamp(BuildTime))
)

// fix drone not support CST timestamp.  # https://github.com/drone/drone/pull/2863
func TimeStamp(buildTime string)  string {
	if buildTime == "" {
		t := time.Now()
		return fmt.Sprintf("%s", t.Format("2006-01-02 15:04:05"))
	}
	return buildTime
}