// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
