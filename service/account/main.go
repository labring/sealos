package main

import (
	"github.com/labring/sealos/service/account/pprof"
	"github.com/labring/sealos/service/account/router"
)

// @title sealos account service
// @version v1alpha1
// @description Your API description.
// @termsOfService https://cloud.sealos.io
// @contact.email bxy4543@gmail.com
// @host localhost:2333
// @BasePath
func main() {
	go pprof.RunPprofServer(10000)
	router.RegisterPayRouter()
}
