// Copyright © 2023 sealos.
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

package buildah

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/containers/storage/pkg/archive"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

func parseDiffType(v string) (DiffType, error) {
	switch v {
	case "all":
		return DiffAll, nil
	case "container":
		return DiffContainer, nil
	case "image":
		return DiffImage, nil
	default:
		return 0, fmt.Errorf("unknown diff type %s", v)
	}
}

// extra type to use as enum
type DiffType uint8

const (
	// only diff containers
	DiffContainer DiffType = 1 << iota
	// only diff images
	DiffImage
	// diff both containers and images
	DiffAll DiffType = 0b11111111
)

func (d DiffType) String() string {
	switch d {
	case DiffAll:
		return "all"
	case DiffContainer:
		return "container"
	case DiffImage:
		return "image"
	default:
		return "unknown"
	}
}

type changesReportJSON struct {
	Changed []string `json:"changed,omitempty"`
	Added   []string `json:"added,omitempty"`
	Deleted []string `json:"deleted,omitempty"`
}

func changesToJSON(out io.Writer, diffs []archive.Change) error {
	body := changesReportJSON{}
	for _, row := range diffs {
		switch row.Kind {
		case archive.ChangeAdd:
			body.Added = append(body.Added, row.Path)
		case archive.ChangeDelete:
			body.Deleted = append(body.Deleted, row.Path)
		case archive.ChangeModify:
			body.Changed = append(body.Changed, row.Path)
		default:
			return fmt.Errorf("output kind %q not recognized", row.Kind)
		}
	}
	enc := json.NewEncoder(out)
	enc.SetIndent("", "     ")
	return enc.Encode(body)
}

func changesToTable(out io.Writer, diffs []archive.Change) error {
	for _, row := range diffs {
		fmt.Fprintln(out, row.String())
	}
	return nil
}

type diffOption struct {
	diffType string
	output   string
	filterFn func(archive.Change) bool
}

func newDiffCommand() *cobra.Command {
	opts := &diffOption{
		filterFn: excludeInitTrees,
	}
	cmd := &cobra.Command{
		Use:   "diff",
		Short: "Inspect changes to the object's file systems",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runDiff(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s diff labring/kubernetes:v1.25 labring/kubernetes:v1.26
  %[1]s diff -o table oci-archive:/path/of/older.tar oci-archive:/path/of/newer.tar`,
			rootCmd.CommandPath()),
	}
	opts.RegisterFlags(cmd.Flags())
	cmd.SetUsageTemplate(UsageTemplate())
	return cmd
}

func (o *diffOption) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVar(&o.diffType, "diff-type", DiffImage.String(), "type of object to diff, available options are [container, image, all]")
	fs.StringVarP(&o.output, "output", "o", "json", "change the output format, available options are [json, table]")
}

var initTrees = map[string]bool{
	"/dev":               true,
	"/etc/hostname":      true,
	"/etc/hosts":         true,
	"/etc/resolv.conf":   true,
	"/proc":              true,
	"/run":               true,
	"/run/notify":        true,
	"/run/.containerenv": true,
	"/run/secrets":       true,
	"/sys":               true,
	"/etc/mtab":          true,
}

func excludeInitTrees(change archive.Change) bool {
	return !initTrees[change.Path]
}

func runDiff(c *cobra.Command, args []string, opts *diffOption) error {
	if len(args) != 2 {
		return fmt.Errorf("%s requires exact 2 arguments", c.CommandPath())
	}
	diffType, err := parseDiffType(opts.diffType)
	if err != nil {
		return err
	}
	r, err := getRuntime(c)
	if err != nil {
		return err
	}

	ctx := getContext()
	if diffType == DiffImage {
		if args, err = r.pullOrLoadImages(ctx, args...); err != nil {
			return err
		}
	}
	from, to, err := r.getLayerIDs(args[0], args[1], diffType)
	if err != nil {
		return err
	}
	changes, err := r.Store.Changes(from, to)
	if err != nil {
		return err
	}
	var diffs []archive.Change
	for _, c := range changes {
		if opts.filterFn(c) {
			diffs = append(diffs, c)
		}
	}
	switch opts.output {
	case "json":
		return changesToJSON(os.Stdout, diffs)
	case "table":
		return changesToTable(os.Stdout, diffs)
	default:
		return fmt.Errorf("unknown output format %s", opts.output)
	}
}
