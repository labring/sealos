/*
Copyright 2022.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package account

import "math"

// CurrencyUnit is the unit of currency for accounting.
const CurrencyUnit = 1000000

func GetCurrencyBalance(balance int64) float64 {
	return math.Ceil(float64(balance) / CurrencyUnit)
}
