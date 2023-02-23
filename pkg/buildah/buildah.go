// Copyright © 2022 buildah.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package buildah

import (
	"errors"
	"fmt"
	"os"
	"runtime"
	"runtime/pprof"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/config"
	"github.com/containers/storage"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/utils/logger"
)

type globalFlags struct {
	LogLevel                   string
	Root                       string
	RunRoot                    string
	StorageDriver              string
	RegistriesConf             string
	RegistriesConfDir          string
	DefaultMountsFile          string
	StorageOpts                []string
	UserNSUID                  []string
	UserNSGID                  []string
	CPUProfile                 string
	cpuProfileFile             *os.File
	MemoryProfile              string
	UserShortNameAliasConfPath string
	CgroupManager              string
}

func (opts *globalFlags) HiddenFlags() []string {
	// hidden most of buildah flags
	return []string{
		"registries-conf",
		"registries-conf-dir",
		"short-name-alias-conf",
		"cgroup-manager",
		"userns-uid-map",
		"userns-gid-map",
		logLevel,
		"cpu-profile",
		"default-mounts-file",
		"memory-profile",
		"root", "runroot", "storage-driver", "storage-opt",
	}
}

const logLevel = "log-level"

func RegisterGlobalFlags(fs *pflag.FlagSet) error {
	var (
		defaultStoreDriverOptions []string
	)
	storageOptions, err := storage.DefaultStoreOptions(false, 0)
	if err != nil {
		return err
	}

	if len(storageOptions.GraphDriverOptions) > 0 {
		optionSlice := storageOptions.GraphDriverOptions[:]
		defaultStoreDriverOptions = optionSlice
	}

	containerConfig, err := config.Default()
	if err != nil {
		return err
	}
	containerConfig.CheckCgroupsAndAdjustConfig()
	// TODO Need to allow for environment variable
	fs.StringVar(&globalFlagResults.RegistriesConf, "registries-conf", "", "path to registries.conf file (not usually used)")
	fs.StringVar(&globalFlagResults.RegistriesConfDir, "registries-conf-dir", "", "path to registries.conf.d directory (not usually used)")
	fs.StringVar(&globalFlagResults.UserShortNameAliasConfPath, "short-name-alias-conf", "", "path to short name alias cache file (not usually used)")
	fs.StringVar(&globalFlagResults.Root, "root", storageOptions.GraphRoot, "storage root dir")
	fs.StringVar(&globalFlagResults.RunRoot, "runroot", storageOptions.RunRoot, "storage state dir")
	fs.StringVar(&globalFlagResults.CgroupManager, "cgroup-manager", containerConfig.Engine.CgroupManager, "cgroup manager")
	fs.StringVar(&globalFlagResults.StorageDriver, "storage-driver", storageOptions.GraphDriverName, "storage-driver")
	fs.StringSliceVar(&globalFlagResults.StorageOpts, "storage-opt", defaultStoreDriverOptions, "storage driver option")
	fs.StringSliceVar(&globalFlagResults.UserNSUID, "userns-uid-map", []string{}, "default `ctrID:hostID:length` UID mapping to use")
	fs.StringSliceVar(&globalFlagResults.UserNSGID, "userns-gid-map", []string{}, "default `ctrID:hostID:length` GID mapping to use")
	fs.StringVar(&globalFlagResults.DefaultMountsFile, "default-mounts-file", "", "path to default mounts file")
	fs.StringVar(&globalFlagResults.LogLevel, logLevel, "warn", `The log level to be used. Either "trace", "debug", "info", "warn", "error", "fatal", or "panic".`)
	fs.StringVar(&globalFlagResults.CPUProfile, "cpu-profile", "", "`file` to write CPU profile")
	fs.StringVar(&globalFlagResults.MemoryProfile, "memory-profile", "", "`file` to write memory profile")
	return markFlagsHidden(fs, globalFlagResults.HiddenFlags()...)
}

var (
	globalFlagResults globalFlags
	rootCmd           *cobra.Command
	unrelatedCommands = []string{"version"}
	postRunHooks      []func() error
)

func markFlagsHidden(fs *pflag.FlagSet, names ...string) error {
	for _, name := range names {
		if err := fs.MarkHidden(name); err != nil {
			return fmt.Errorf("unable to mark %s flag as hidden: %v", name, err)
		}
	}
	return nil
}

func subCommands() []*cobra.Command {
	return []*cobra.Command{
		newBuildCommand(),
		newContainersCommand(),
		newCreateCmd(),
		newFromCommand(),
		newImagesCommand(),
		newInspectCommand(),
		newLoadCommand(),
		newLoginCommand(),
		newLogoutCommand(),
		newManifestCommand(),
		newMountCommand(),
		newMergeCommand(),
		newPullCommand(),
		newPushCommand(),
		newRMCommand(),
		newRMICommand(),
		newSaveCommand(),
		newTagCommand(),
		newUmountCommand(),
		newUnshareCommand(),
	}
}

func RegisterRootCommand(cmd *cobra.Command) {
	os.Setenv("TMPDIR", parse.GetTempDir())
	rootCmd = cmd
	cmd.SilenceUsage = true
	err := RegisterGlobalFlags(cmd.PersistentFlags())
	bailOnError(err, "failed to register global flags")
	wrapPrePersistentRun(cmd)
	wrapPostPersistentRun(cmd)
	cmd.AddCommand(subCommands()...)
}

func RegisterPostRun(fn func() error) {
	if rootCmd == nil {
		logger.Fatal("Must not register post run function before RegisterRootCommand")
	}
	postRunHooks = append(postRunHooks, fn)
}

func AddUnrelatedCommandNames(names ...string) {
	unrelatedCommands = append(unrelatedCommands, names...)
}

func skipUnrelatedCommandRun(cmd *cobra.Command) bool {
	for _, name := range unrelatedCommands {
		if name == cmd.Name() {
			return true
		}
	}
	return false
}

func wrapPrePersistentRun(cmd *cobra.Command) {
	switch {
	case cmd.PersistentPreRun != nil:
		run := cmd.PersistentPreRun
		cmd.PersistentPreRun = func(cmd *cobra.Command, args []string) {
			if skipUnrelatedCommandRun(cmd) {
				return
			}
			bailOnError(TrySetupWithDefaults(defaultSetters...), "unable to setup")
			run(cmd, args)
		}
	case cmd.PersistentPreRunE != nil:
		runE := cmd.PersistentPreRunE
		cmd.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
			if skipUnrelatedCommandRun(cmd) {
				return nil
			}
			bailOnError(TrySetupWithDefaults(defaultSetters...), "unable to setup")
			return runE(cmd, args)
		}
	default:
		cmd.PersistentPreRun = func(cmd *cobra.Command, args []string) {
			if skipUnrelatedCommandRun(cmd) {
				return
			}
			bailOnError(TrySetupWithDefaults(defaultSetters...), "unable to setup")
		}
	}
}

func wrapPostPersistentRun(cmd *cobra.Command) {
	// shutdown store if necessary
	switch {
	case cmd.PersistentPostRun != nil:
		run := cmd.PersistentPostRun
		cmd.PersistentPostRun = func(cmd *cobra.Command, args []string) {
			bailOnError(after(cmd), "")
			run(cmd, args)
		}
	case cmd.PersistentPostRunE != nil:
		runE := cmd.PersistentPostRunE
		cmd.PersistentPostRunE = func(cmd *cobra.Command, args []string) error {
			bailOnError(after(cmd), "")
			return runE(cmd, args)
		}
	default:
		cmd.PersistentPostRun = func(cmd *cobra.Command, args []string) {
			bailOnError(after(cmd), "")
		}
	}
}

func shutdownStore(cmd *cobra.Command) error {
	if needToShutdownStore {
		store, err := getStore(cmd)
		if err != nil {
			return err
		}
		logger.Debug("shutting down the store")
		needToShutdownStore = false
		if _, err = store.Shutdown(false); err != nil {
			if errors.Is(err, storage.ErrLayerUsedByContainer) {
				logger.Info("failed to shutdown storage: %q", err)
			} else {
				logger.Warn("failed to shutdown storage: %q", err)
			}
		}
	}
	return nil
}

func after(cmd *cobra.Command) error {
	if err := shutdownStore(cmd); err != nil {
		return err
	}

	if globalFlagResults.CPUProfile != "" {
		pprof.StopCPUProfile()
		globalFlagResults.cpuProfileFile.Close()
	}
	if globalFlagResults.MemoryProfile != "" {
		memoryProfileFile, err := os.Create(globalFlagResults.MemoryProfile)
		if err != nil {
			logger.Fatal("could not create memory profile %s: %v", globalFlagResults.MemoryProfile, err)
		}
		defer memoryProfileFile.Close()
		runtime.GC()
		if err := pprof.Lookup("heap").WriteTo(memoryProfileFile, 1); err != nil {
			logger.Fatal("could not write memory profile %s: %v", globalFlagResults.MemoryProfile, err)
		}
	}
	for i := range postRunHooks {
		if err := postRunHooks[i](); err != nil {
			return err
		}
	}
	return nil
}

func init() {
	original := defaultSetters
	defaultSetters = []Setter{maybeSetupLogrusLogger, maybeSetupProfiler}
	defaultSetters = append(defaultSetters, original...)
}

func maybeSetupLogrusLogger() (err error) {
	logrusLvl, err := logrus.ParseLevel(globalFlagResults.LogLevel)
	if err != nil {
		return fmt.Errorf("unable to parse log level: %w", err)
	}
	if logrusLvl <= logrus.DebugLevel {
		logrus.SetLevel(logrusLvl)
	}
	return nil
}

func maybeSetupProfiler() (err error) {
	if globalFlagResults.CPUProfile != "" {
		cpuProfileFile, err := os.Create(globalFlagResults.CPUProfile)
		if err != nil {
			return fmt.Errorf("could not create CPU profile %s: %v", globalFlagResults.CPUProfile, err)
		}
		globalFlagResults.cpuProfileFile = cpuProfileFile
		if err = pprof.StartCPUProfile(globalFlagResults.cpuProfileFile); err != nil {
			return fmt.Errorf("error starting CPU profiling: %v", err)
		}
	}
	return nil
}
