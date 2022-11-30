package buildah

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newSaveCommand() *cobra.Command {
	var (
		opts        = newDefaultPushOptions()
		archiveName string
	)

	saveCommand := &cobra.Command{
		Use:   "save",
		Short: "Save image into archive file",
		RunE: func(cmd *cobra.Command, args []string) error {
			return pushCmd(cmd, []string{
				args[0],
				fmt.Sprintf("%s:%s:%s", DockerArchive, archiveName, args[0]),
			}, opts)
		},
		Example: fmt.Sprintf(`%[1]s save -o kubernetes.tar labring/kubernetes:latest`, rootCmd.Name()),
	}
	saveCommand.SetUsageTemplate(UsageTemplate())

	saveCommand.Flags().StringVarP(&archiveName, "output", "o", "", "save image into tar archive file")
	return saveCommand
}
