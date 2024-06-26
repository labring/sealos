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

package controllers

import (
	"testing"
	"time"
)

func Test_splitSmsCodeMap(t *testing.T) {
	codeMap, err := splitSmsCodeMap("0:SMS_123456,1:SMS_654321,2:SMS_987654")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("codeMap: %v", codeMap)
	if len(codeMap) != 3 {
		t.Fatal("invalid codeMap")
	}
	if codeMap[0] != "SMS_123456" {
		t.Fatal("invalid codeMap")
	}
	if codeMap[1] != "SMS_654321" {
		t.Fatal("invalid codeMap")
	}
	if codeMap[2] != "SMS_987654" {
		t.Fatal("invalid codeMap")
	}
}

func TestGetTimeInUTCPlus8(t *testing.T) {
	t1 := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	t2 := time.Date(2023, 1, 1, 1, 0, 0, 0, time.UTC)
	t3 := time.Date(2023, 1, 1, 9, 0, 0, 0, time.UTC)
	t4 := time.Date(2023, 1, 1, 11, 0, 0, 0, time.UTC)
	t5 := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)
	t6 := time.Date(2023, 1, 1, 13, 0, 0, 0, time.UTC)
	t7 := time.Date(2023, 1, 1, 23, 0, 0, 0, time.UTC)
	for _, _t := range []time.Time{t1, t2, t3, t4, t5, t6, t7} {
		t.Logf("time: %v, timeInUTCPlus8: %v", _t, GetSendVmsTimeInUTCPlus8(_t))
	}
}
