package main

import (
	"os"
	"strconv"

	"github.com/labring/sealos/controllers/account/testdata/api"
)

func main() {
	args := os.Args
	if len(args) != 3 {
		panic("args error,len(args) != 3")
	}
	amount, err := strconv.Atoi(args[2])
	if err != nil {
		panic(err)
	}
	if err := api.RechargeAccount(args[1], "sealos-system", int64(amount)); err != nil {
		panic(err)
	}
}
