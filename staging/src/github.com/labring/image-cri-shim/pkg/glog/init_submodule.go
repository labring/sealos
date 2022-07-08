//go:build !image_cri_shim
// +build !image_cri_shim

// Copyright © 2022 sealos.
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

package glog

import "flag"

func regVar(p flag.Value, name string, usage string) {
	if flag.Lookup(name) == nil {
		flag.Var(p, name, usage)
	}
}

func getVarFlag(name string) flag.Value {
	return flag.Lookup(name).Value.(flag.Getter).Get().(flag.Value)
}

func regBoolVar(p *bool, name string, value bool, usage string) {
	if flag.Lookup(name) == nil {
		flag.BoolVar(p, name, value, usage)
	}
}

func getBoolFlag(name string) bool {
	return flag.Lookup(name).Value.(flag.Getter).Get().(bool)
}

func init() {
	regBoolVar(&logging.toStderr, "logtostderr", false, "log to standard error instead of files")
	regBoolVar(&logging.alsoToStderr, "alsologtostderr", false, "log to standard error as well as files")
	regVar(&logging.verbosity, "v", "log level for V logs")
	regVar(&logging.stderrThreshold, "stderrthreshold", "logs at or above this threshold go to stderr")
	regVar(&logging.vmodule, "vmodule", "comma-separated list of pattern=N settings for file-filtered logging")
	regVar(&logging.traceLocation, "log_backtrace_at", "when logging hits line file:N, emit a stack trace")

	// Default stderrThreshold is ERROR.
	logging.stderrThreshold = errorLog

	logging.setVState(0, nil, false)
	go logging.flushDaemon()
}
