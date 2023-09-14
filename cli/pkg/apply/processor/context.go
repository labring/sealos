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

import "context"

var commandKey struct{}

func WithCommands(ctx context.Context, commands []string) context.Context {
	return context.WithValue(ctx, commandKey, commands)
}

func GetCommands(ctx context.Context) []string {
	v := ctx.Value(commandKey)
	if v != nil {
		return v.([]string)
	}
	return nil
}

var envKey struct{}

func WithEnvs(ctx context.Context, envs map[string]string) context.Context {
	return context.WithValue(ctx, envKey, envs)
}

func GetEnvs(ctx context.Context) map[string]string {
	v := ctx.Value(commandKey)
	if v != nil {
		return v.(map[string]string)
	}
	return nil
}
