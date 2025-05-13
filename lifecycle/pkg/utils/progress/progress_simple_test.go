/*
Copyright 2022 cuisongliu@qq.com.

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

package progress

import (
	"testing"

	"github.com/schollz/progressbar/v3"
)

func TestSimple(t *testing.T) {
	tests := []struct {
		name  string
		title string
		count int
	}{
		{
			name:  "normal case",
			title: "test progress",
			count: 100,
		},
		{
			name:  "empty title",
			title: "",
			count: 50,
		},
		{
			name:  "zero count",
			title: "zero progress",
			count: 0,
		},
		{
			name:  "negative count",
			title: "negative progress",
			count: -10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bar := Simple(tt.title, tt.count)
			if bar == nil {
				t.Error("progress bar should not be nil")
			}
			if _, ok := interface{}(bar).(*progressbar.ProgressBar); !ok {
				t.Error("returned value should be *progressbar.ProgressBar")
			}
		})
	}
}
