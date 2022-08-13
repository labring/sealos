// Copyright © 2022 buildah.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package buildah

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/containers/buildah"
	"github.com/containers/storage"
	"github.com/pkg/errors"
)

//var containersHeader = map[string]string{
//	"ContainerName": "CONTAINER NAME",
//	"ContainerID":   "CONTAINER ID",
//	"Builder":       "BUILDER",
//	"ImageID":       "IMAGE ID",
//	"ImageName":     "IMAGE NAME",
//}

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

type containerOptions struct {
	all        bool
	format     string
	json       bool
	noHeading  bool
	noTruncate bool
	quiet      bool
}

type jsonContainer struct {
	ID            string `json:"id"`
	Builder       bool   `json:"builder"`
	ImageID       string `json:"imageid"`
	ImageName     string `json:"imagename"`
	ContainerName string `json:"containername"`
}

//type containerOutputParams struct {
//	ContainerID   string
//	Builder       string
//	ImageID       string
//	ImageName     string
//	ContainerName string
//}

func GetContainers() ([]byte, error) {
	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return []byte{}, err
	}
	iopts := containersResults{
		all:        false,
		filter:     "name=",
		format:     "",
		json:       true,
		noheading:  false,
		notruncate: false,
		quiet:      false,
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

	params, err = parseCtrFilter(iopts.filter)
	if err != nil {
		return []byte{}, errors.Wrapf(err, "error parsing filter")
	}

	if !opts.noHeading && !opts.quiet && opts.format == "" && !opts.json {
		containerOutputHeader(!opts.noTruncate)
	}
	return outputContainers(store, opts, params)
}

// default return json
func outputContainers(store storage.Store, opts containerOptions, params *containerFilterParams) ([]byte, error) {
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
		return []byte{}, errors.Wrapf(err, "error reading build containers")
	}
	var (
		//containerOutput []containerOutputParams
		JSONContainers []jsonContainer
	)
	if !opts.all {
		// only output containers created by buildah
		for _, builder := range builders {
			image := imageNameForID(builder.FromImageID)
			if !matchesCtrFilter(builder.ContainerID, builder.Container, builder.FromImageID, image, params) {
				continue
			}
			if opts.json {
				JSONContainers = append(JSONContainers, jsonContainer{ID: builder.ContainerID,
					Builder:       true,
					ImageID:       builder.FromImageID,
					ImageName:     image,
					ContainerName: builder.Container})
				continue
			}
			//output := containerOutputParams{
			//	ContainerID:   builder.ContainerID,
			//	Builder:       "   *",
			//	ImageID:       builder.FromImageID,
			//	ImageName:     image,
			//	ContainerName: builder.Container,
			//}
			//containerOutput = append(containerOutput, output)
		}
	}
	// default，json
	if opts.json {
		data, err := json.MarshalIndent(JSONContainers, "", "    ")
		if err != nil {
			return []byte{}, err
		}
		//fmt.Printf("%s\n", data)
		return data, nil
	}

	//if opts.format != "" {
	//	out := formats.StdoutTemplateArray{Output: containersToGeneric(containerOutput), Template: opts.format, Fields: containersHeader}
	//	return formats.Writer(out).Out()
	//}

	//for _, ctr := range containerOutput {
	//	if opts.quiet {
	//		fmt.Printf("%-64s\n", ctr.ContainerID)
	//		continue
	//	}
	//	containerOutputUsingFormatString(!opts.noTruncate, ctr)
	//}
	return []byte{}, nil
}

//func containersToGeneric(templParams []containerOutputParams) (genericParams []interface{}) {
//	if len(templParams) > 0 {
//		for _, v := range templParams {
//			genericParams = append(genericParams, interface{}(v))
//		}
//	}
//	return genericParams
//}

func parseCtrFilter(filter string) (*containerFilterParams, error) {
	params := new(containerFilterParams)
	filters := strings.Split(filter, ",")
	for _, param := range filters {
		pair := strings.SplitN(param, "=", 2)
		if len(pair) != 2 {
			return nil, errors.Errorf("incorrect filter value %q, should be of form filter=value", param)
		}
		switch strings.TrimSpace(pair[0]) {
		case "id":
			params.id = pair[1]
		case "name":
			params.name = pair[1]
		case "ancestor":
			params.ancestor = pair[1]
		default:
			return nil, errors.Errorf("invalid filter %q", pair[0])
		}
	}
	return params, nil
}

func containerOutputHeader(truncate bool) {
	if truncate {
		fmt.Printf("%-12s  %-8s %-12s %-32s %s\n", "CONTAINER ID", "BUILDER", "IMAGE ID", "IMAGE NAME", "CONTAINER NAME")
	} else {
		fmt.Printf("%-64s %-8s %-64s %-32s %s\n", "CONTAINER ID", "BUILDER", "IMAGE ID", "IMAGE NAME", "CONTAINER NAME")
	}
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

func matchesID(imageID, argID string) bool {
	return strings.HasPrefix(imageID, argID)
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

func matchesReference(name, argName string) bool {
	if argName == "" {
		return true
	}
	splitName := strings.Split(name, ":")
	// If the arg contains a tag, we handle it differently than if it does not
	if strings.Contains(argName, ":") {
		splitArg := strings.Split(argName, ":")
		return strings.HasSuffix(splitName[0], splitArg[0]) && (splitName[1] == splitArg[1])
	}
	return strings.HasSuffix(splitName[0], argName)
}

//func containerOutputUsingFormatString(truncate bool, params containerOutputParams) {
//	if truncate {
//		fmt.Printf("%-12.12s  %-8s %-12.12s %-32s %s\n", params.ContainerID, params.Builder, params.ImageID, util.TruncateString(params.ImageName, 32), params.ContainerName)
//	} else {
//		fmt.Printf("%-64s %-8s %-64s %-32s %s\n", params.ContainerID, params.Builder, params.ImageID, params.ImageName, params.ContainerName)
//	}
//}
