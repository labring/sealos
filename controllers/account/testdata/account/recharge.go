package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/labring/sealos/controllers/account/testdata/api"
)

func main() {
	args := os.Args
	if len(args) != 4 {
		panic("help: ./account [recharge|deduction] [accountName] [amount]")
	}
	amount, err := strconv.Atoi(args[3])
	if err != nil {
		panic(fmt.Errorf("args error, args[3]: %s must be int, err: %v", args[3], err))
	}
	accountName := strings.TrimPrefix(strings.ToLower(args[2]), "ns-")
	switch strings.ToLower(args[1]) {
	case "recharge", "r", "-r":
		if err := api.RechargeAccount(accountName, "sealos-system", int64(amount)); err != nil {
			panic(err)
		}
	case "deduction", "d", "-d":
		if err := api.DeductionAccount(accountName, "sealos-system", int64(amount)); err != nil {
			panic(err)
		}
	default:
		panic("args error, args[1] must be recharge or deduction")
	}
	a := map[string]struct{}{}
	delete(a, "a")
}
