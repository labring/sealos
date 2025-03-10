// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package cmd

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"

	"github.com/labring/sealos/pkg/template"
	fileutils "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
)

type renderOptions struct {
	values []string
	sets   []string
	clear  bool
}

func (o *renderOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringSliceVarP(&o.values, "values", "f", []string{}, "values files for context")
	fs.StringSliceVar(&o.sets, "set", []string{}, "k/v sets for context")
	fs.BoolVarP(&o.clear, "clear", "c", false, "clean up template files after rendering")
}

func newRenderCommand() *cobra.Command {
	opts := &renderOptions{}
	cmd := &cobra.Command{
		Use:   "render",
		Short: "render template files with values and envs",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRender(opts, args)
		},
	}
	opts.RegisterFlags(cmd.Flags())
	return cmd
}

func loadValues(valueFiles, sets []string) (map[string]interface{}, error) {
	valueOpt := &values.Options{
		ValueFiles: valueFiles,
		Values:     sets,
	}
	return valueOpt.MergeValues([]getter.Provider{{
		Schemes: []string{"http", "https"},
		New:     getter.NewHTTPGetter,
	}})
}

func findTemplateFiles(paths ...string) ([]string, error) {
	var ret []string
	for i := range paths {
		files, err := fileutils.FindFilesMatchExtension(paths[i], ".tpl", ".tmpl")
		if err != nil {
			return nil, err
		}
		ret = append(ret, files...)
	}
	return ret, nil
}

func runRender(opts *renderOptions, args []string) error {
	mergedValues, err := loadValues(opts.values, opts.sets)
	if err != nil {
		return err
	}
	envs := maps.FromSlice(os.Environ())
	data := make(map[string]interface{})
	// For compatibility with older templates
	for k, v := range envs {
		data[k] = v
	}

	data["Values"] = mergedValues
	data["Env"] = envs

	filepaths, err := findTemplateFiles(args...)
	if err != nil {
		return err
	}
	for i := range filepaths {
		if err := func(fp string) error {
			logger.Debug("found template file %s, trying to rendering", fp)
			trimed := strings.TrimSuffix(fp, filepath.Ext(fp))
			if fileutils.IsExist(trimed) {
				logger.Debug("found existing file %s, override it", trimed)
			}
			file, err := os.OpenFile(trimed, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0666)
			if err != nil {
				return err
			}
			defer file.Close()
			b, err := fileutils.ReadAll(fp)
			if err != nil {
				return err
			}
			t, err := template.Parse(string(b))
			if err != nil {
				return err
			}
			if err = t.Execute(file, data); err != nil {
				return err
			}
			logger.Info("render %s from %s completed", trimed, fp)
			if opts.clear {
				return os.Remove(fp)
			}
			return nil
		}(filepaths[i]); err != nil {
			return err
		}
	}
	return nil
}

func init() {
	rootCmd.AddCommand(newRenderCommand())
}
