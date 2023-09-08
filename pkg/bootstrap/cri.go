/*
Copyright 2023 cuisongliu@qq.com.

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

package bootstrap

import "github.com/labring/sealos/pkg/utils/logger"

type defaultCRIInitializer struct{}

func (*defaultCRIInitializer) String() string { return "cri_initializer" }

func (initializer *defaultCRIInitializer) Filter(_ Context, _ string) bool {
	return true
}

func (initializer *defaultCRIInitializer) Apply(ctx Context, host string) error {
	initCRI := ctx.GetBash().InitCRIBash(host)
	if initCRI == "" {
		logger.Debug("skip init cri shell by label")
		return nil
	}
	return ctx.GetExecer().CmdAsync(host, initCRI)
}

func (initializer *defaultCRIInitializer) Undo(ctx Context, host string) error {
	cleanCRI := ctx.GetBash().CleanCRIBash(host)
	if cleanCRI == "" {
		logger.Debug("skip clean cri shell by label")
		return nil
	}
	return ctx.GetExecer().CmdAsync(host, cleanCRI)
}
