/*
Copyright 2023.

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

package controllers

import "testing"

func Test_giveGift(t *testing.T) {
	type args struct {
		amount int64
	}
	const BaseUnit = 1_000_000
	tests := []struct {
		name string
		args args
		want int64
	}{
		// [1-298] -> 0%, [299-598] -> 10%, [599-1998] -> 15%, [1999-4998] -> 20%, [4999-19998] -> 25%, [19999+] -> 30%
		{name: "0% less than 299", args: args{amount: 100 * BaseUnit}, want: 0},
		{name: "10% between 299 and 599", args: args{amount: 299 * BaseUnit}, want: 29_900_000},
		{name: "10% between 299 and 599", args: args{amount: 300 * BaseUnit}, want: 30_000_000},
		{name: "15% between 599 and 1999", args: args{amount: 599 * BaseUnit}, want: 89_850_000},
		{name: "15% between 599 and 1999", args: args{amount: 600 * BaseUnit}, want: 90_000_000},
		{name: "20% between 1999 and 4999", args: args{amount: 1999 * BaseUnit}, want: 399_800_000},
		{name: "20% between 1999 and 4999", args: args{amount: 2000 * BaseUnit}, want: 400_000_000},
		{name: "25% between 4999 and 19999", args: args{amount: 4999 * BaseUnit}, want: 1249_750_000},
		{name: "25% between 4999 and 19999", args: args{amount: 5000 * BaseUnit}, want: 1250_000_000},
		{name: "30% more than 19999", args: args{amount: 19999 * BaseUnit}, want: 5999_700_000},
		{name: "30% more than 19999", args: args{amount: 20000 * BaseUnit}, want: 6000_000_000},
		{name: "30% more than 19999", args: args{amount: 99999 * BaseUnit}, want: 29999_700_000},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := giveGift(tt.args.amount); got != tt.want {
				t.Errorf("giveGift() = %v, want %v", got, tt.want)
			}
		})
	}
}
