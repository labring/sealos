package buildah

import (
	"fmt"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/libimage"
	"github.com/spf13/cobra"
)

func newTagCommand() *cobra.Command {
	var (
		tagDescription = "\n  Adds one or more additional names to locally-stored image."
	)
	tagCommand := &cobra.Command{
		Use:   "tag",
		Short: "Add an additional name to a local image",
		Long:  tagDescription,
		RunE:  tagCmd,

		Example: fmt.Sprintf(`%[1]s tag imageName firstNewName
  %[1]s tag imageName firstNewName SecondNewName`, rootCmd.Name()),
		Args: cobra.MinimumNArgs(2),
	}
	tagCommand.SetUsageTemplate(UsageTemplate())
	return tagCommand
}

func tagCmd(c *cobra.Command, args []string) error {
	store, err := getStore(c)
	if err != nil {
		return err
	}
	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}

	// Allow tagging manifest list instead of resolving instances from manifest
	lookupOptions := &libimage.LookupImageOptions{ManifestList: true}
	image, _, err := runtime.LookupImage(args[0], lookupOptions)
	if err != nil {
		return err
	}

	for _, tag := range args[1:] {
		if err := image.Tag(tag); err != nil {
			return err
		}
	}
	return nil
}
