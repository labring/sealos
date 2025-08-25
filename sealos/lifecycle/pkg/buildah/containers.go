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
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	"github.com/containers/buildah/pkg/formats"
	"github.com/containers/buildah/util"
	"github.com/containers/storage"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

var containersHeader = map[string]string{
	"ContainerName": "CONTAINER NAME",
	"ContainerID":   "CONTAINER ID",
	"Builder":       "BUILDER",
	"ImageID":       "IMAGE ID",
	"ImageName":     "IMAGE NAME",
}

type JSONContainer struct {
	ID            string `json:"id"`
	Builder       bool   `json:"builder"`
	ImageID       string `json:"imageid"`
	ImageName     string `json:"imagename"`
	ContainerName string `json:"containername"`
}

type containerOutputParams struct {
	ContainerID   string
	Builder       string
	ImageID       string
	ImageName     string
	ContainerName string
}

type containerOptions struct {
	all        bool
	format     string
	json       bool
	noHeading  bool
	noTruncate bool
	quiet      bool
}

type containerFilterParams struct {
	id       string
	name     string
	ancestor string
}

type containersResults struct {
	all        bool
	filter     string
	format     string
	json       bool
	noheading  bool
	notruncate bool
	quiet      bool
}

func newDefaultContainerResults() *containersResults {
	return &containersResults{}
}

func (opts *containersResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.BoolVarP(&opts.all, "all", "a", opts.all, "also list non-buildah containers")
	fs.StringVarP(&opts.filter, "filter", "f", opts.filter, "filter output based on conditions provided")
	fs.StringVar(&opts.format, "format", opts.format, "pretty-print containers using a Go template")
	fs.BoolVar(&opts.json, "json", opts.json, "output in JSON format")
	fs.BoolVarP(&opts.noheading, "noheading", "n", opts.noheading, "do not print column headings")
	fs.BoolVar(&opts.notruncate, "notruncate", opts.notruncate, "do not truncate output")
	fs.BoolVarP(&opts.quiet, "quiet", "q", opts.quiet, "display only container IDs")
}

func newContainersCommand() *cobra.Command {
	var (
		containersDescription = "\n  Lists containers which appear to be " + define.Package + " working containers, their\n  names and IDs, and the names and IDs of the images from which they were\n  initialized."
		opts                  = newDefaultContainerResults()
	)
	containersCommand := &cobra.Command{
		Use:     "containers",
		Hidden:  true,
		Aliases: []string{"list", "ls", "ps"},
		Short:   "List working containers and their base images",
		Long:    containersDescription,
		Args:    cobra.ExactArgs(0),
		//Flags:                  sortFlags(containersFlags),
		RunE: func(cmd *cobra.Command, args []string) error {
			return containersCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s containers
  %[1]s containers --format "{{.ContainerID}} {{.ContainerName}}"
  %[1]s containers -q --noheading --notruncate`, rootCmd.CommandPath()),
	}
	containersCommand.SetUsageTemplate(UsageTemplate())

	opts.RegisterFlags(containersCommand.Flags())
	return containersCommand
}

func containersCmd(c *cobra.Command, args []string, iopts *containersResults) error {
	if len(args) > 0 {
		return fmt.Errorf("'%s' does not accept arguments", c.CommandPath())
	}
	store, err := getStore(c)
	if err != nil {
		return err
	}

	if flagChanged(c, "quiet") && flagChanged(c, "format") {
		return errors.New("quiet and format are mutually exclusive")
	}

	opts := containerOptions{
		all:        iopts.all,
		format:     iopts.format,
		json:       iopts.json,
		noHeading:  iopts.noheading,
		noTruncate: iopts.notruncate,
		quiet:      iopts.quiet,
	}

	var params *containerFilterParams
	if flagChanged(c, "filter") {
		params, err = parseCtrFilter(iopts.filter)
		if err != nil {
			return fmt.Errorf("parsing filter: %w", err)
		}
	}

	if !opts.noHeading && !opts.quiet && opts.format == "" && !opts.json {
		containerOutputHeader(!opts.noTruncate)
	}

	return outputContainers(store, opts, params)
}

func readContainers(store storage.Store, opts containerOptions, params *containerFilterParams) ([]containerOutputParams, []JSONContainer, error) {
	seenImages := make(map[string]string)
	imageNameForID := func(id string) string {
		if id == "" {
			return buildah.BaseImageFakeName
		}
		imageName, ok := seenImages[id]
		if ok {
			return imageName
		}
		img, err2 := store.Image(id)
		if err2 == nil && len(img.Names) > 0 {
			seenImages[id] = img.Names[0]
		}
		return seenImages[id]
	}

	builders, err := openBuilders(store)
	if err != nil {
		return nil, nil, fmt.Errorf("reading build containers: %w", err)
	}
	var (
		containerOutput []containerOutputParams
		JSONContainers  []JSONContainer
	)
	if !opts.all {
		// only output containers created by buildah
		for _, builder := range builders {
			image := imageNameForID(builder.FromImageID)
			if !matchesCtrFilter(builder.ContainerID, builder.Container, builder.FromImageID, image, params) {
				continue
			}
			if opts.json {
				JSONContainers = append(JSONContainers, JSONContainer{ID: builder.ContainerID,
					Builder:       true,
					ImageID:       builder.FromImageID,
					ImageName:     image,
					ContainerName: builder.Container})
				continue
			}
			output := containerOutputParams{
				ContainerID:   builder.ContainerID,
				Builder:       "   *",
				ImageID:       builder.FromImageID,
				ImageName:     image,
				ContainerName: builder.Container,
			}
			containerOutput = append(containerOutput, output)
		}
	} else {
		// output all containers currently in storage
		builderMap := make(map[string]struct{})
		for _, builder := range builders {
			builderMap[builder.ContainerID] = struct{}{}
		}
		containers, err2 := store.Containers()
		if err2 != nil {
			return nil, nil, fmt.Errorf("reading list of all containers: %w", err2)
		}
		for _, container := range containers {
			name := ""
			if len(container.Names) > 0 {
				name = container.Names[0]
			}
			_, ours := builderMap[container.ID]
			builder := ""
			if ours {
				builder = "   *"
			}
			if !matchesCtrFilter(container.ID, name, container.ImageID, imageNameForID(container.ImageID), params) {
				continue
			}
			if opts.json {
				JSONContainers = append(JSONContainers, JSONContainer{ID: container.ID,
					Builder:       ours,
					ImageID:       container.ImageID,
					ImageName:     imageNameForID(container.ImageID),
					ContainerName: name})
				continue
			}
			output := containerOutputParams{
				ContainerID:   container.ID,
				Builder:       builder,
				ImageID:       container.ImageID,
				ImageName:     imageNameForID(container.ImageID),
				ContainerName: name,
			}
			containerOutput = append(containerOutput, output)
		}
	}
	return containerOutput, JSONContainers, nil
}

func outputContainers(store storage.Store, opts containerOptions, params *containerFilterParams) error {
	containerOutput, JSONContainers, err := readContainers(store, opts, params)
	if err != nil {
		return err
	}
	if opts.json {
		data, err := json.MarshalIndent(JSONContainers, "", "    ")
		if err != nil {
			return err
		}
		fmt.Printf("%s\n", data)
		return nil
	}

	if opts.format != "" {
		out := formats.StdoutTemplateArray{Output: containersToGeneric(containerOutput), Template: opts.format, Fields: containersHeader}
		return formats.Writer(out).Out()
	}

	for _, ctr := range containerOutput {
		if opts.quiet {
			fmt.Printf("%-64s\n", ctr.ContainerID)
			continue
		}
		containerOutputUsingFormatString(!opts.noTruncate, ctr)
	}
	return nil
}

func containersToGeneric(templParams []containerOutputParams) (genericParams []interface{}) {
	if len(templParams) > 0 {
		for _, v := range templParams {
			genericParams = append(genericParams, interface{}(v))
		}
	}
	return genericParams
}

func containerOutputUsingFormatString(truncate bool, params containerOutputParams) {
	if truncate {
		fmt.Printf("%-12.12s  %-8s %-12.12s %-32s %s\n", params.ContainerID, params.Builder, params.ImageID, util.TruncateString(params.ImageName, 32), params.ContainerName)
	} else {
		fmt.Printf("%-64s %-8s %-64s %-32s %s\n", params.ContainerID, params.Builder, params.ImageID, params.ImageName, params.ContainerName)
	}
}

func containerOutputHeader(truncate bool) {
	if truncate {
		fmt.Printf("%-12s  %-8s %-12s %-32s %s\n", "CONTAINER ID", "BUILDER", "IMAGE ID", "IMAGE NAME", "CONTAINER NAME")
	} else {
		fmt.Printf("%-64s %-8s %-64s %-32s %s\n", "CONTAINER ID", "BUILDER", "IMAGE ID", "IMAGE NAME", "CONTAINER NAME")
	}
}

func parseCtrFilter(filter string) (*containerFilterParams, error) {
	params := new(containerFilterParams)
	filters := strings.Split(filter, ",")
	for _, param := range filters {
		pair := strings.SplitN(param, "=", 2)
		if len(pair) != 2 {
			return nil, fmt.Errorf("incorrect filter value %q, should be of form filter=value", param)
		}
		switch strings.TrimSpace(pair[0]) {
		case "id":
			params.id = pair[1]
		case "name":
			params.name = pair[1]
		case "ancestor":
			params.ancestor = pair[1]
		default:
			return nil, fmt.Errorf("invalid filter %q", pair[0])
		}
	}
	return params, nil
}

func matchesCtrName(ctrName, argName string) bool {
	return strings.Contains(ctrName, argName)
}

func matchesAncestor(imgName, imgID, argName string) bool {
	if matchesID(imgID, argName) {
		return true
	}
	return matchesReference(imgName, argName)
}

func matchesCtrFilter(ctrID, ctrName, imgID, imgName string, params *containerFilterParams) bool {
	if params == nil {
		return true
	}
	if params.id != "" && !matchesID(ctrID, params.id) {
		return false
	}
	if params.name != "" && !matchesCtrName(ctrName, params.name) {
		return false
	}
	if params.ancestor != "" && !matchesAncestor(imgName, imgID, params.ancestor) {
		return false
	}
	return true
}
