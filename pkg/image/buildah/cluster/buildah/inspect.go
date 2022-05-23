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
	"fmt"
	"os"
	"regexp"
	"text/template"

	"github.com/containers/buildah"
	"github.com/pkg/errors"
	"golang.org/x/term"
)

const (
	inspectTypeContainer = "container"
	inspectTypeImage     = "image"
	inspectTypeManifest  = "manifest"
)

type inspectResults struct {
	format      string
	inspectType string
}

func Inspect(name string) (buildah.BuilderInfo, error) {
	var iopts inspectResults
	iopts.format = ""
	iopts.inspectType = inspectTypeContainer

	var builder *buildah.Builder

	systemContext, err := getSystemContext(false)
	if err != nil {
		return buildah.BuilderInfo{}, errors.Wrapf(err, "error building system context")
	}

	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return buildah.BuilderInfo{}, err
	}

	ctx := getContext()

	switch iopts.inspectType {
	case inspectTypeContainer:
		builder, err = openBuilder(ctx, store, name)
		if err != nil {
			//if c.Flag("type").Changed {
			//	return errors.Wrapf(err, "error reading build container")
			//}
			builder, err = openImage(ctx, systemContext, store, name)
			if err != nil {
				if manifestErr := manifestInspect(ctx, store, systemContext, name); manifestErr == nil {
					return buildah.BuilderInfo{}, nil
				}
				return buildah.BuilderInfo{}, err
			}
		}
	case inspectTypeImage:
		builder, err = openImage(ctx, systemContext, store, name)
		if err != nil {
			return buildah.BuilderInfo{}, err
		}
	case inspectTypeManifest:
		return buildah.BuilderInfo{}, manifestInspect(ctx, store, systemContext, name)
	default:
		return buildah.BuilderInfo{}, errors.Errorf("the only recognized types are %q and %q", inspectTypeContainer, inspectTypeImage)
	}
	out := buildah.GetBuildInfo(builder)
	if iopts.format != "" {
		format := iopts.format
		if matched, err := regexp.MatchString("{{.*}}", format); err != nil {
			return buildah.BuilderInfo{}, errors.Wrapf(err, "error validating format provided: %s", format)
		} else if !matched {
			return buildah.BuilderInfo{}, errors.Errorf("error invalid format provided: %s", format)
		}
		t, err := template.New("format").Parse(format)
		if err != nil {
			return buildah.BuilderInfo{}, errors.Wrapf(err, "Template parsing error")
		}
		if err = t.Execute(os.Stdout, out); err != nil {
			return buildah.BuilderInfo{}, err
		}
		if term.IsTerminal(int(os.Stdout.Fd())) {
			fmt.Println()
		}
		return buildah.BuilderInfo{}, nil
	}

	//enc := json.NewEncoder(os.Stdout)
	//enc.SetIndent("", "    ")
	//if term.IsTerminal(int(os.Stdout.Fd())) {
	//	enc.SetEscapeHTML(false)
	//}
	//return enc.Encode(out)
	return out, nil
}
