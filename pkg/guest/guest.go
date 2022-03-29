package guest

import (
	"fmt"
	strings2 "strings"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/image"
	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/fork/golang/expansion"
	"github.com/fanux/sealos/pkg/utils/maps"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/fanux/sealos/pkg/utils/strings"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

type Interface interface {
	Apply(cluster *v2.Cluster) error
	Delete(cluster *v2.Cluster) error
}

type Default struct {
	imageService image.Service
}

func NewGuestManager() (Interface, error) {
	is, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	return &Default{imageService: is}, nil
}

func (d *Default) Apply(cluster *v2.Cluster) error {
	clusterRootfs := runtime.GetContantData(cluster.Name).RootFSPath()
	img, err := d.imageService.Inspect(cluster.Spec.Image)
	if err != nil {
		return fmt.Errorf("get cluster image failed, %s", err)
	}
	sshClient := ssh.NewSSHClient(&cluster.Spec.SSH, true)
	envInterface := env.NewEnvProcessor(cluster)
	envs := envInterface.WrapperEnv(cluster.GetMaster0IP()) //clusterfile
	guestCMD := strings2.Join(d.getGuestCmd(envs, cluster, img), " ")
	for _, value := range []string{guestCMD} {
		if value == "" {
			continue
		}

		if err = sshClient.CmdAsync(cluster.GetMaster0IP(), fmt.Sprintf(contants.CdAndExecCmd, clusterRootfs, value)); err != nil {
			return err
		}
	}
	return nil
}

//Image Entrypoint	Image Cmd	Container command	Container args	Command run
//	[/ep-1]			[foo bar]		<not set>			<not set>	[ep-1 foo bar]
//	[/ep-1]			[foo bar]		[/ep-2]				<not set>	[ep-2]
//	[/ep-1]			[foo bar]		<not set>			[zoo boo]	[ep-1 zoo boo]
//	[/ep-1]			[foo bar]		[/ep-2]				[zoo boo]	[ep-2 zoo boo]
func (d *Default) getGuestCmd(envs map[string]string, cluster *v2.Cluster, image *v1.Image) []string {
	if image.Config.Env != nil {
		baseEnvs := maps.ListToMap(image.Config.Env)
		envs = maps.MergeMap(baseEnvs, envs)
	}

	mapping := expansion.MappingFuncFor(envs)
	//If you do not supply command or args for a Container, the defaults defined in the Docker image are used.
	//If you supply a command but no args for a Container, only the supplied command is used. The default EntryPoint and the default Cmd defined in the Docker image are ignored.
	//If you supply only args for a Container, the default Entrypoint defined in the Docker image is run with the args that you supplied.
	//If you supply a command and args, the default Entrypoint and the default Cmd defined in the Docker image are ignored. Your command is run with your args.
	if len(cluster.Spec.Command) != 0 && len(cluster.Spec.Args) == 0 {
		image.Config.Cmd = []string{}
	}
	command := make([]string, 0)
	args := make([]string, 0)
	if len(cluster.Spec.Command) != 0 {
		for _, cmd := range cluster.Spec.Command {
			command = append(command, expansion.Expand(cmd, mapping))
		}
	}

	if len(cluster.Spec.Args) != 0 {
		for _, arg := range cluster.Spec.Args {
			args = append(args, expansion.Expand(arg, mapping))
		}
	}

	if len(command) == 0 {
		command = image.Config.Entrypoint
	}

	if len(args) == 0 {
		args = image.Config.Cmd
	}
	resCmd := append(command, args...)
	resCmd = expandSh(resCmd)
	resCmd = expandBash(resCmd)
	return resCmd
}

func expandBash(resCmd []string) []string {
	defaultBash := []string{"bash", "/bin/bash", "/usr/bin/bash"}
	if len(resCmd) > 0 {
		if strings.InList(resCmd[0], defaultBash) {
			if len(resCmd) > 2 {
				if strings.TrimSpaceWS(resCmd[1]) == "-c" {
					resCmd = resCmd[2:]
					return resCmd
				}
			}
			resCmd = resCmd[1:]
			return resCmd
		}
	}
	return resCmd
}

func expandSh(resCmd []string) []string {
	defaultSh := []string{"sh", "/bin/sh", "/usr/bin/sh"}
	if len(resCmd) > 0 {
		if strings.InList(resCmd[0], defaultSh) {
			if len(resCmd) > 2 {
				if strings.TrimSpaceWS(resCmd[1]) == "-c" {
					resCmd = resCmd[2:]
					return resCmd
				}
			}
			resCmd = resCmd[1:]
			return resCmd
		}
	}
	return resCmd
}

func (d Default) Delete(cluster *v2.Cluster) error {
	panic("implement me")
}
