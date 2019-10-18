package install

import (
	"archive/tar"
	"bufio"
	"fmt"
	"github.com/wonderivan/logger"
	"io"
	"os"
	"strings"
	"sync"
)

//Command is
type Command struct {
	Name string // LOAD START APPLY DELETE STOP REMOVE
	Cmd  string // kubectl apply -k
	Type string
}

type PkgConfig struct {
	Cmds []Command
	URL  string
	Name string
}

func nameFromUrl(url string) string {
	s := strings.Split(url, "/")
	if len(s) < 1 {
		return "app"
	}
	tmp := s[len(s)-1]
	name := strings.SplitN(tmp, ".", 2)
	if len(name) != 2 {
		return "app"
	}
	return name[0]
}

//AppInstall is
func AppInstall(url string) {
	c := &SealConfig{}
	c.Load("")

	pkgConfig, err := LoadConfig(url)
	pkgConfig.URL = url
	pkgConfig.Name = nameFromUrl(url)
	if err != nil {
		logger.Error("load config failed: %s", err)
		os.Exit(0)
	}
	Exec(pkgConfig, *c)
}

// LoadConfig from tar package
/*
kube.tar
   config
   images.tar

config content:

LOAD docker load -i images.tar
START systemctl start docker
DELETE docker rmi
STOP systemctl top
APPLY kubectl apply -f
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

func Exec(c *PkgConfig, config SealConfig) {
	everyNodesCmd, masterOnlyCmd := NewCommands(c.Cmds)
	everyNodesCmd.Run(config, c.URL, c.Name)
	masterOnlyCmd.Run(config, c.URL, c.Name)
}

type Runner interface {
	Run(config SealConfig, url, pkgName string)
}

// return command run on every nodes and run only on master node
func NewCommands(cmds []Command) (Runner, Runner) {
	everyNodesCmd := &RunOnEveryNodes{}
	masterOnlyCmd := &RunOnMaster{}
	for _, c := range cmds {
		switch c.Name {
		case "REMOVE", "STOP", "START", "LOAD":
			everyNodesCmd.Cmd = append(everyNodesCmd.Cmd, c)
		case "DELETE", "APPLY":
			masterOnlyCmd.Cmd = append(masterOnlyCmd.Cmd, c)
		default:
			logger.Warn("Unknown command:%s,%s", c.Name, c.Cmd)
		}
	}

	return everyNodesCmd, masterOnlyCmd
}

type RunOnEveryNodes struct {
	Cmd []Command
}

func (r *RunOnEveryNodes) Run(config SealConfig, url, pkgName string) {
	var wg sync.WaitGroup
	tarCmd := fmt.Sprintf("tar xvf %s.tar", pkgName)
	workspace := fmt.Sprintf("/root/%s", pkgName)

	nodes := append(config.Masters, config.Nodes...)
	FetchPackage(url, nodes, workspace)
	for _, node := range nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			Cmd(node, tarCmd)
			for _, cmd := range r.Cmd {
				CmdWorkSpace(node, cmd.Cmd, workspace)
			}
		}(node)
	}

	wg.Wait()
}

type RunOnMaster struct {
	Cmd []Command
}

func (r *RunOnMaster) Run(config SealConfig, url, pkgName string) {
	workspace := fmt.Sprintf("/root/%s", pkgName)
	SendPackage(url, []string{config.Masters[0]}, pkgName)
	for _, cmd := range r.Cmd {
		CmdWorkSpace(config.Masters[0], cmd.Cmd, workspace)
	}
}

func CmdWorkSpace(node, cmd, workdir string) {
	command := fmt.Sprintf("cd %s && %s", workdir, cmd)
	Cmd(node, command)
}
