package checker

import (
	"fmt"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/pkg/errors"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// FileAvailableCheck checks that the given file does not already exist.
type FileAvailableCheck struct {
	path  string
	label string
	ip    string
}

func NewFileAvailableCheck(path, label string, ip string) Interface {
	return &FileAvailableCheck{
		path:  path,
		label: label,
		ip:    ip,
	}
}

// Name returns label for individual FileAvailableChecks. If not known, will return based on path.
func (fac FileAvailableCheck) Name() string {
	if fac.label != "" {
		return fmt.Sprintf("%s:%s", fac.ip, fac.label)
	}
	return fmt.Sprintf("%s:FileAvailable-%s", fac.ip, strings.Replace(fac.path, "/", "-", -1))
}

// Check validates if the given file does not already exist.
func (fac FileAvailableCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	logger.Debug("validating the existence of file %s", fac.path)
	FileAvailableCMD := fmt.Sprintf("stat %s", fac.path)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	FileInfo, err := SSH.CmdToString(fac.ip, FileAvailableCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get file info")}
	}
	if FileInfo != fmt.Sprintf("stat: cannot stat %s: No such file or directory", fac.path) {
		return nil, []error{fmt.Errorf("%s already exists", fac.path)}
	}
	return nil, nil
}

// InpathCheck checks if the given executable is present in $path
type InpathCheck struct {
	//executable is the name of the executable to check.
	executable string
	//mandatory indicates if the executable is mandatory for the operation to continue.
	mandatory  bool
	suggestion string
	label      string
	ip         string
}

func NewInpathCheck(executable string, mandatory bool, suggestion string, label string, ip string) Interface {
	return &InpathCheck{executable: executable, mandatory: mandatory, suggestion: suggestion, label: label, ip: ip}
}

// Name returns label for individual InPathCheck. If not known, will return based on path.
func (ipc InpathCheck) Name() string {
	if ipc.label != "" {
		return fmt.Sprintf("%s :%s", ipc.ip, ipc.label)
	}
	return fmt.Sprintf("%s :InpathCheck", ipc.ip)
}

// Check validates if the given commend does not in path.
func (ipc InpathCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:validating the presence of executable %s ", ipc.ip, ipc.executable)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	InpathCMD := fmt.Sprintf("which  %s", ipc.executable)
	_, err := SSH.CmdToString(ipc.ip, InpathCMD, "")
	if err != nil {
		return nil, []error{errors.Errorf("executable %s not found in $PATH", ipc.executable)}
	}
	if ipc.mandatory {
		//Return as a error:
		return nil, []error{errors.Errorf("%s not found in system path", ipc.executable)}
	}
	// Return as a warning:
	warningMessage := fmt.Sprintf("%s not found in system path", ipc.executable)
	if ipc.suggestion != "" {
		warningMessage += fmt.Sprintf("\nSuggestion: %s", ipc.suggestion)
	}
	return []error{errors.New(warningMessage)}, nil
}

// FileContentCheck checks that the given file contains the string Content.
type FileContentCheck struct {
	path    string
	content []byte
	label   string
	ip      string
}

func NewFileContentCheck(path string, content []byte, label string, ip string) Interface {
	return &FileContentCheck{}
}

// Name returns label for individual FileContentChecks. If not known, will return based on path.
func (fcc FileContentCheck) Name() string {
	if fcc.label != "" {
		return fmt.Sprintf("%s :%s", fcc.ip, fcc.label)
	}
	return fmt.Sprintf("%s :FileContent-%s", fcc.ip, strings.Replace(fcc.path, "/", "-", -1))
}

// Check validates if the given file contains the given content.
func (fcc FileContentCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	logger.Debug("%s:validating the content of file %s", fcc.ip, fcc.path)
	FileContentCMD := fmt.Sprintf("cat %s | grep \"%s\"", fcc.path, string(fcc.content))
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	FileContent, err := SSH.CmdToString(fcc.ip, FileContentCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get file content")}
	}
	if FileContent != "" {
		return nil, []error{fmt.Errorf("%s contents are not set to %s", fcc.path, fcc.content)}
	}
	return nil, nil
}

type DirAvailableCheck struct {
	path  string
	label string
	ip    string
}

func NewDirAvailableCheck(path, label string, ip string) Interface {
	return &DirAvailableCheck{
		path:  path,
		label: label,
		ip:    ip,
	}
}

func (dac DirAvailableCheck) Name() string {
	if dac.label != "" {
		return fmt.Sprintf("%s:%s", dac.ip, dac.label)
	}
	return fmt.Sprintf("%s:DirAvailable-%s", dac.ip, strings.Replace(dac.path, "/", "-", -1))
}

func (dac DirAvailableCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	logger.Debug("validating the existence of directory %s", dac.path)
	DirAvailableCMD := fmt.Sprintf("stat %s", dac.path)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	FileInfo, err := SSH.CmdToString(dac.ip, DirAvailableCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get file info")}
	}
	if FileInfo != fmt.Sprintf("stat: cannot stat %s: No such file or directory", dac.path) {
		return nil, []error{fmt.Errorf("the file %s already exists", dac.path)}
	}
	return nil, nil
}
