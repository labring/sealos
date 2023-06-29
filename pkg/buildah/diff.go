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
	"os/exec"
	"strconv"
	"strings"

	"github.com/containers/common/libimage"
	"github.com/containers/storage/pkg/archive"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/utils/logger"
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

type patchOption struct {
	enabled bool
	save    bool
	tag     string
}

func (o *patchOption) RegisterFlags(fs *pflag.FlagSet) {
	fs.BoolVar(&o.enabled, "patch", false, "if enabled then create a named archive file contains changes that we interested")
	fs.StringVarP(&o.tag, "tag", "t", "", `tag name, diff will auto build a new image with the generated changes if flag specified and --patch=true`)
	fs.BoolVar(&o.save, "save", false, `if enabled and --tag flag is specified, diff will save the built image into a oci-archive file with the name of --output`)
}

type diffOption struct {
	patchOption
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
			if err := opts.ValidateAndSetDefaults(); err != nil {
				return err
			}
			return runDiff(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s diff labring/kubernetes:v1.25 labring/kubernetes:v1.26
  %[1]s diff -o table oci-archive:/path/of/older.tar oci-archive:/path/of/newer.tar
  %[1]s diff --patch --save --o patch.tar -t labring/kubernetes:patch-from-125-126 labring/kubernetes:v1.25 labring/kubernetes:v1.26`,
			rootCmd.CommandPath()),
	}
	opts.RegisterFlags(cmd.Flags())
	opts.patchOption.RegisterFlags(cmd.Flags())
	cmd.Flags().AddFlagSet(getPlatformFlags())
	cmd.SetUsageTemplate(UsageTemplate())

	return cmd
}

func (o *diffOption) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVar(&o.diffType, "diff-type", DiffImage.String(), "type of object to diff, available options are [container, image, all]")
	fs.StringVarP(&o.output, "output", "o", "json", "change the output format, available options are [json, table]")
}

func (o *diffOption) ValidateAndSetDefaults() error {
	if o.patchOption.enabled {
		tmpFn := o.filterFn
		o.filterFn = func(c archive.Change) bool {
			return tmpFn(c) && filterPatchFileRequired(c)
		}
	}
	return nil
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

func filterPatchFileRequired(change archive.Change) bool {
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
		if args, err = r.PullOrLoadImages(ctx, args, libimage.CopyOptions{}); err != nil {
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
	if !opts.patchOption.enabled {
		switch opts.output {
		case "json":
			return changesToJSON(os.Stdout, diffs)
		case "table":
			return changesToTable(os.Stdout, diffs)
		default:
			return fmt.Errorf("unknown output format %s", opts.output)
		}
	}
	img, err := r.Store.Image(args[1])
	if err != nil {
		return err
	}
	target, err := r.Store.DifferTarget(img.TopLayer)
	if err != nil {
		return fmt.Errorf("failed to get diff target: %v", err)
	}
	rc, err := archive.ExportChanges(target, diffs, nil, nil)
	if err != nil {
		return err
	}
	defer rc.Close()
	// save into archive file only
	if opts.patchOption.tag == "" {
		compression := guessCompression(opts.output)
		extension := "." + compression.Extension()
		out := opts.output
		if !strings.HasSuffix(out, extension) {
			out = out + extension
		}
		file, err := os.Create(out)
		if err != nil {
			return err
		}
		defer file.Close()
		wc, err := archive.CompressStream(file, compression)
		if err != nil {
			return err
		}
		defer wc.Close()
		_, err = io.Copy(wc, rc)
		if err == nil {
			logger.Info("file %s saved", out)
		}
		return err
	}
	// rebuild
	tmpDir, err := os.MkdirTemp("", "diff-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)
	if err = archive.Unpack(rc, tmpDir, &archive.TarOptions{}); err != nil {
		return err
	}
	debug, _ := c.Flags().GetBool("debug")
	if err = rerun("build",
		fmt.Sprintf("--debug=%s", strconv.FormatBool(debug)),
		fmt.Sprintf("-t=%s", opts.patchOption.tag),
		"--save-image=false", tmpDir,
	); err != nil {
		return err
	}
	// save new image
	if opts.patchOption.save {
		if err = rerun("save",
			fmt.Sprintf("--debug=%s", strconv.FormatBool(debug)),
			fmt.Sprintf("--output=%s", opts.output), opts.patchOption.tag,
		); err != nil {
			return err
		}
	}
	return nil
}

func rerun(command string, args ...string) error {
	cmd := exec.Command("/proc/self/exe", append([]string{command}, args...)...)
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	return cmd.Run()
}

const (
	tarExt = "tar"
)

func guessCompression(v string) archive.Compression {
	switch {
	case strings.HasSuffix(v, tarExt+".bz2"):
		return archive.Bzip2
	case strings.HasSuffix(v, tarExt+".gz"):
		return archive.Gzip
	case strings.HasSuffix(v, tarExt+".xz"):
		return archive.Xz
	case strings.HasSuffix(v, tarExt+".zst"):
		return archive.Zstd
	default:
		return archive.Uncompressed
	}
}
