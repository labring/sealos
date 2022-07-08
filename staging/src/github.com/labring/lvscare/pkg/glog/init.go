//go:build lvscare
// +build lvscare

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

func init() {
	flag.BoolVar(&logging.toStderr, "logtostderr", false, "log to standard error instead of files")
	flag.BoolVar(&logging.alsoToStderr, "alsologtostderr", false, "log to standard error as well as files")
	flag.Var(&logging.verbosity, "v", "log level for V logs")
	flag.Var(&logging.stderrThreshold, "stderrthreshold", "logs at or above this threshold go to stderr")
	flag.Var(&logging.vmodule, "vmodule", "comma-separated list of pattern=N settings for file-filtered logging")
	flag.Var(&logging.traceLocation, "log_backtrace_at", "when logging hits line file:N, emit a stack trace")

	// Default stderrThreshold is ERROR.
	logging.stderrThreshold = errorLog

	logging.setVState(0, nil, false)
	go logging.flushDaemon()
}
