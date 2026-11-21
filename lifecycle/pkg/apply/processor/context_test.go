/*
Copyright 2023 fengxsong@outlook.com.

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

package processor

import (
	"context"
	"testing"
)

func TestContextEnvAndCommandValues(t *testing.T) {
	ctx := WithCommands(context.Background(), []string{"sealos cert"})
	ctx = WithEnvs(ctx, map[string]string{"KEY": "VALUE"})

	if commands := GetCommands(ctx); len(commands) != 1 || commands[0] != "sealos cert" {
		t.Fatalf("commands were lost: %v", commands)
	}
	// A command override used to shadow the env value and crash the reader.
	if envs := GetEnvs(ctx); envs["KEY"] != "VALUE" {
		t.Fatalf("envs were lost: %v", envs)
	}
}
