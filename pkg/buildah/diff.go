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
	"strings"

	"github.com/containers/storage/pkg/archive"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

func parseCompression(v string) archive.Compression {
	switch v {
	case "gzip":
		return archive.Gzip
	case "bzip2":
		return archive.Bzip2
	case "xz":
		return archive.Xz
	case "zstd":
		return archive.Zstd
	default:
		return archive.Uncompressed
	}
}

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
	save        bool
	diffType    string
	out         string
	compression string
}

func newDiffCommand() *cobra.Command {
	opts := new(diffOption)
	cmd := &cobra.Command{
		Use:    "diff",
		Short:  "Inspect changes to the object's file systems",
		Hidden: true,
		Args:   cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runDiff(cmd, args, opts)
		},
	}
	opts.RegisterFlags(cmd.Flags())
	return cmd
}

func (o *diffOption) RegisterFlags(fs *pflag.FlagSet) {
	fs.BoolVar(&o.save, "save", false, "If enabled then create a named archive file contains changes that we interested")
	fs.StringVar(&o.diffType, "diff-type", DiffImage.String(), "Type of object to diff, container/image/all")
	fs.StringVarP(&o.out, "out", "o", "json", "Change the output format, json/table")
	fs.StringVar(&o.compression, "compression", "gzip", "Compression algorithm")
	bailOnError(markFlagsHidden(fs, "compression"), "")
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

func filterRequired(change archive.Change, force bool) bool {
	if initTrees[change.Path] {
		return false
	}
	if force {
		return true
	}
	switch change.Kind {
	case archive.ChangeAdd:
		return true
	case archive.ChangeModify:
		if !strings.HasPrefix(change.Path, "/registry") {
			return true
		}
	}
	return false
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
		if args, err = r.pullOrLoadImages(ctx, args); err != nil {
			return err
		}
	}
	from, to, err := r.getLayerIDs(args[0], args[1], diffType)
	if err != nil {
		return err
	}
	changes, err := r.store.Changes(from, to)
	if err != nil {
		return err
	}
	var diffs []archive.Change
	for _, c := range changes {
		if filterRequired(c, !opts.save) {
			diffs = append(diffs, c)
		}
	}
	if !opts.save {
		switch opts.out {
		case "json":
			return changesToJSON(os.Stdout, diffs)
		case "table":
			return changesToTable(os.Stdout, diffs)
		}
	} else {
		img, err := r.store.Image(args[1])
		if err != nil {
			return err
		}
		mountPoint, err := r.store.MountImage(img.ID, []string{}, "")
		if err != nil {
			return err
		}
		compression := parseCompression(opts.compression)
		file, err := os.Create(opts.out + "." + compression.Extension())
		if err != nil {
			return err
		}
		defer file.Close()
		wc, err := archive.CompressStream(file, compression)
		if err != nil {
			return err
		}
		rc, err := archive.ExportChanges(mountPoint, diffs, nil, nil)
		if err != nil {
			return err
		}
		_, err = io.Copy(wc, rc)
		return err
	}
	return nil
}
