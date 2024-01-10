package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	dbserver "github.com/labring/sealos/service/database/server"
	"github.com/labring/sealos/service/pkg/server"
)

func main() {
	log.SetOutput(os.Stdout)
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	flag.Parse()

	cf := flag.Arg(0)
	if cf == "" {
		fmt.Println("The config file is not specified")
		return
	}

	config, err := server.InitConfig(cf)
	if err != nil {
		fmt.Println(err)
		return
	}

	rs := dbserver.DatabaseServer{
		ConfigFile: cf,
	}

	rs.Serve(config)
}
