package install

import (
	"archive/tar"
	"bufio"
	"fmt"
	"github.com/wonderivan/logger"
	"io"
	"os"
	"strings"
)

//Command is
type Command struct {
	Name string // LOAD START APPLY DELETE STOP REMOVE
	Cmd string  // kubectl apply -k
	Type string
}

type PkgConfig struct {
	Cmds []Command
}

/*
func BuildInstall(name string) {
	hosts := append(Masters, Nodes...)
	i := &SealosInstaller{
		Hosts: hosts,
	}
	i.CheckValid()
	i.SendPackage(name)
	i.KubeApply(name)
}

func (s *SealosInstaller) KubeApply(name string) {
	args := "-f"
	if Kustomize {
		args = "-k"
	}
	kubeCmd := fmt.Sprintf("cd /root/%s/conf && kubectl apply %s .", name, args)
	Cmd(Masters[0], kubeCmd)
}
 */

// LoadConfig from tar package
/*
kube.tar
   config
   images.tar
*/
func LoadConfig(packageFile string) (*PkgConfig, error) {
	file, err := os.Open(packageFile)
	if err != nil {
		return nil, err
	}

	tr := tar.NewReader(file)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break // End of archive
		}
		if err != nil {
			return nil, err
		}
		if hdr.Name == "config" {
			logger.Info("config content: ")
			config, err := configFromReader(tr)
			return config, err
		}
	}
	return nil, err
}

func configFromReader(reader io.Reader) (*PkgConfig, error) {
	config := &PkgConfig{}
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		command := Command{}
		text := scanner.Text()
		logger.Info(text) // Println will add back the final '\n'
		name, cmd, err := decodeCmd(text)
		if err != nil {
			logger.Error(err)
			continue
		}
		command.Name = name
		command.Cmd = cmd

		config.Cmds = append(config.Cmds, command)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read config line failed %s", err)
	}
	return config, nil
}

// text is "LOAD docker load -i images.tar"
// name LOAD
// cmd docker load -i images.tar
func decodeCmd(text string) (name string, cmd string, err error) {
	list := strings.SplitN(text, " ", 2)
	if len(list) != 2 {
		return "", "", fmt.Errorf("Command fomat error:[%s]", text)
	}
	return list[0], list[1], nil
}
