package main

import (
	"flag"
	"fmt"

	"github.com/labring/sealos/controllers/imagehub/api-service/internal/config"
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/handler"
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/svc"

	"github.com/zeromicro/go-zero/core/conf"
	"github.com/zeromicro/go-zero/rest"
)

var configFile = flag.String("f", "etc/config.yaml", "the config file")

func main() {
	flag.Parse()

	var c config.Config
	conf.MustLoad(*configFile, &c)

	server := rest.MustNewServer(c.RestConf)
	defer server.Stop()

	ctx, err := svc.NewServiceContext(c)
	if err != nil {
		fmt.Println("NewServiceContext error: ", err)
		return
	}

	handler.RegisterHandlers(server, ctx)

	fmt.Printf("Starting server at %s:%d...\n", c.Host, c.Port)
	server.Start()
}
