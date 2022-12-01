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
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/formats"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/libimage"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	"github.com/docker/go-units"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

const none = "<none>"

type jsonImage struct {
	ID           string    `json:"id"`
	Names        []string  `json:"names"`
	Digest       string    `json:"digest"`
	CreatedAt    string    `json:"createdat"`
	Size         string    `json:"size"`
	Created      int64     `json:"created"`
	CreatedAtRaw time.Time `json:"createdatraw"`
	ReadOnly     bool      `json:"readonly"`
	History      []string  `json:"history"`
}

type imageOutputParams struct {
	Tag          string
	ID           string
	Name         string
	Digest       string
	Created      int64
	CreatedAt    string
	Size         string
	CreatedAtRaw time.Time
	ReadOnly     bool
	History      string
}

type imageOptions struct {
	all       bool
	digests   bool
	format    string
	json      bool
	noHeading bool
	truncate  bool
	quiet     bool
	readOnly  bool
	history   bool
}

func newDefaultImageResults() *imageResults {
	return &imageResults{
		imageOptions: imageOptions{},
	}
}

func (opts *imageResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.BoolVarP(&opts.all, "all", "a", opts.all, "show all images, including intermediate images from a build")
	fs.BoolVar(&opts.digests, "digests", opts.digests, "show digests")
	fs.StringSliceVarP(&opts.filter, "filter", "f", opts.filter, "filter output based on conditions provided")
	fs.StringVar(&opts.format, "format", opts.format, "pretty-print images using a Go template")
	fs.BoolVar(&opts.json, "json", opts.json, "output in JSON format")
	fs.BoolVarP(&opts.noHeading, "noheading", "n", opts.noHeading, "do not print column headings")
	// TODO needs alias here -- to `notruncate`
	fs.BoolVar(&opts.truncate, "no-trunc", opts.truncate, "do not truncate output")
	fs.BoolVarP(&opts.quiet, "quiet", "q", opts.quiet, "display only image IDs")
	fs.BoolVarP(&opts.history, "history", "", opts.history, "display the image name history")
}

type imageResults struct {
	imageOptions
	filter []string
}

var imagesHeader = map[string]string{
	"Name":      "REPOSITORY",
	"Tag":       "TAG",
	"ID":        "IMAGE ID",
	"CreatedAt": "CREATED",
	"Size":      "SIZE",
	"ReadOnly":  "R/O",
	"History":   "HISTORY",
}

func newImagesCommand() *cobra.Command {
	var (
		opts              = newDefaultImageResults()
		imagesDescription = "\n  Lists locally stored images."
	)
	imagesCommand := &cobra.Command{
		Use:   "images",
		Short: "List images in local storage",
		Long:  imagesDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return imagesCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s images --all
  %[1]s images [imageName]
  %[1]s images --format '{{.ID}} {{.Name}} {{.Size}} {{.CreatedAtRaw}}'`, rootCmd.Name()),
	}
	imagesCommand.SetUsageTemplate(UsageTemplate())

	opts.RegisterFlags(imagesCommand.Flags())
	return imagesCommand
}

func imagesCmd(c *cobra.Command, args []string, iopts *imageResults) error {
	if len(args) > 0 {
		if iopts.all {
			return errors.New("when using the --all switch, you may not pass any images names or IDs")
		}

		if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
			return err
		}
		if len(args) > 1 {
			return fmt.Errorf("'%s images' requires at most 1 argument", rootCmd.Name())
		}
	}
	if iopts.quiet && iopts.format != "" {
		return errors.New("quiet and format are mutually exclusive")
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}
	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}

	images, err := readImages(store, systemContext, args, iopts)
	if err != nil {
		return err
	}

	opts := imageOptions{
		all:       iopts.all,
		digests:   iopts.digests,
		format:    iopts.format,
		json:      iopts.json,
		noHeading: iopts.noHeading,
		truncate:  !iopts.truncate,
		quiet:     iopts.quiet,
		history:   iopts.history,
	}

	if opts.json {
		return formatImagesJSON(images, opts)
	}

	return formatImages(images, opts)
}

func readImages(store storage.Store, systemContext *types.SystemContext, names []string, iopts *imageResults) ([]*libimage.Image, error) {
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	options := &libimage.ListImagesOptions{}
	if len(iopts.filter) > 0 {
		options.Filters = iopts.filter
	}
	if !iopts.all {
		options.Filters = append(options.Filters, "intermediate=false")
	}

	return runtime.ListImages(ctx, names, options)
}

func outputHeader(opts imageOptions) string {
	if opts.format != "" {
		return strings.Replace(opts.format, `\t`, "\t", -1)
	}
	if opts.quiet {
		return formats.IDString
	}
	format := "table {{.Name}}\t{{.Tag}}\t"
	if opts.noHeading {
		format = "{{.Name}}\t{{.Tag}}\t"
	}

	if opts.digests {
		format += "{{.Digest}}\t"
	}
	format += "{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"
	if opts.readOnly {
		format += "\t{{.ReadOnly}}"
	}
	if opts.history {
		format += "\t{{.History}}"
	}
	return format
}

func formatImagesJSON(images []*libimage.Image, opts imageOptions) error {
	jsonImages := []jsonImage{}
	for _, image := range images {
		// Copy the base data over to the output param.
		size, err := image.Size()
		if err != nil {
			return err
		}
		created := image.Created()
		jsonImages = append(jsonImages,
			jsonImage{
				CreatedAtRaw: created,
				Created:      created.Unix(),
				CreatedAt:    units.HumanDuration(time.Since(created)) + " ago",
				Digest:       image.Digest().String(),
				ID:           truncateID(image.ID(), opts.truncate),
				Names:        image.Names(),
				ReadOnly:     image.IsReadOnly(),
				Size:         formattedSize(size),
			})
	}

	data, err := json.MarshalIndent(jsonImages, "", "    ")
	if err != nil {
		return err
	}
	fmt.Printf("%s\n", data)
	return nil
}

type imagesSorted []imageOutputParams

func (a imagesSorted) Less(i, j int) bool {
	return a[i].CreatedAtRaw.After(a[j].CreatedAtRaw)
}

func (a imagesSorted) Len() int {
	return len(a)
}

func (a imagesSorted) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}

func formatImages(images []*libimage.Image, opts imageOptions) error {
	var outputData imagesSorted

	for _, image := range images {
		var outputParam imageOutputParams
		size, err := image.Size()
		if err != nil {
			return err
		}
		created := image.Created()
		outputParam.CreatedAtRaw = created
		outputParam.Created = created.Unix()
		outputParam.CreatedAt = units.HumanDuration(time.Since(created)) + " ago"
		outputParam.Digest = image.Digest().String()
		outputParam.ID = truncateID(image.ID(), opts.truncate)
		outputParam.Size = formattedSize(size)
		outputParam.ReadOnly = image.IsReadOnly()

		repoTags, err := image.NamedRepoTags()
		if err != nil {
			return err
		}

		nameTagPairs, err := libimage.ToNameTagPairs(repoTags)
		if err != nil {
			return err
		}

		for _, pair := range nameTagPairs {
			newParam := outputParam
			newParam.Name = pair.Name
			newParam.Tag = pair.Tag
			newParam.History = formatHistory(image.NamesHistory(), pair.Name, pair.Tag)
			outputData = append(outputData, newParam)
			// `images -q` should a given ID only once.
			if opts.quiet {
				break
			}
		}
	}

	sort.Sort(outputData)
	out := formats.StdoutTemplateArray{Output: imagesToGeneric(outputData), Template: outputHeader(opts), Fields: imagesHeader}
	return formats.Writer(out).Out()
}

func formatHistory(history []string, name, tag string) string {
	if len(history) == 0 {
		return none
	}
	// Skip the first history entry if already existing as name
	if fmt.Sprintf("%s:%s", name, tag) == history[0] {
		if len(history) == 1 {
			return none
		}
		return strings.Join(history[1:], ", ")
	}
	return strings.Join(history, ", ")
}

func truncateID(id string, truncate bool) string {
	if !truncate {
		return "sha256:" + id
	}
	idTruncLength := 12
	if len(id) > idTruncLength {
		return id[:idTruncLength]
	}
	return id
}

func imagesToGeneric(templParams []imageOutputParams) (genericParams []interface{}) {
	if len(templParams) > 0 {
		for _, v := range templParams {
			genericParams = append(genericParams, interface{}(v))
		}
	}
	return genericParams
}

func formattedSize(size int64) string {
	suffixes := [5]string{"B", "KB", "MB", "GB", "TB"}

	count := 0
	formattedSize := float64(size)
	for formattedSize >= 1000 && count < 4 {
		formattedSize /= 1000
		count++
	}
	return fmt.Sprintf("%.3g %s", formattedSize, suffixes[count])
}

func matchesID(imageID, argID string) bool {
	return strings.HasPrefix(imageID, argID)
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
