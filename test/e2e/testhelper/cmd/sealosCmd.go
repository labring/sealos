package cmd

import (
	"os"

	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"github.com/labring/sealos/test/e2e/testhelper/utils"
)

type SealosCmd struct {
	BinPath    string
	CriBinPath string
	Executor   Interface
	ImageService
	ClusterCycle
	CRICycle
}

func NewSealosCmd(binPath string, executor Interface) *SealosCmd {
	return &SealosCmd{
		BinPath:  binPath,
		Executor: executor,
	}
}

func (s *SealosCmd) SetCriBinPath() error {
	binPath, err := utils.GetBinPath("crictl")
	if err != nil {
		return err
	}
	s.CriBinPath = binPath
	return nil
}

type ClusterCycle interface {
	Apply(*ApplyOptions) error
	Build(*BuildOptions) error
	Create(*CreateOptions) ([]byte, error)
	Add(*AddOptions) error
	Delete(*DeleteOptions) error
	Run(*RunOptions) error
	Reset(*ResetOptions) error
	Cert(*CertOptions) error
}

type ImageService interface {
	ImagePull(*PullOptions) error
	ImagePush(image string) error
	ImageList() error
	ImageTag(name, newName string) error
	ImageSave(image string, path string, archive string) error
	ImageLoad(path string) error
	ImageMerge(options *MergeOptions) error
	ImageRemove(images ...string) error
	ImageInspect(image string) error
}

type CRICycle interface {
	CRIImageList(display bool) (*ImageStruct, error)
	CRIProcessList(display bool) (*ProcessStruct, error)
	CRIPodList(display bool) (*PodStruct, error)
	CRIImagePull(name string) error
}

func isDebug() bool {
	if val, _ := os.LookupEnv(settings.TestDEBUG); val == "true" {
		return true
	}
	return false
}

func SetDebug() {
	_ = os.Setenv(settings.TestDEBUG, "true")
}

func (s *SealosCmd) Apply(args *ApplyOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"apply"}, args.Args()...)...)
}

func (s *SealosCmd) Build(args *BuildOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"build"}, args.Args()...)...)
}

func (s *SealosCmd) Create(args *CreateOptions) ([]byte, error) {
	if isDebug() {
		args.Debug = true
	}
	if args.Short {
		return s.Executor.Exec(s.BinPath, append([]string{"create"}, args.Args()...)...)
	}
	return nil, s.Executor.AsyncExec(s.BinPath, append([]string{"create"}, args.Args()...)...)
}

func (s *SealosCmd) Add(args *AddOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"add"}, args.Args()...)...)
}

func (s *SealosCmd) Delete(args *DeleteOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"delete"}, args.Args()...)...)
}

func (s *SealosCmd) Run(args *RunOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"run"}, args.Args()...)...)
}

func (s *SealosCmd) Reset(args *ResetOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"reset"}, args.Args()...)...)
}

func (s *SealosCmd) Cert(args *CertOptions) error {
	if isDebug() {
		args.Debug = true
	}
	return s.Executor.AsyncExec(s.BinPath, append([]string{"cert"}, args.Args()...)...)
}

func (s *SealosCmd) ImagePull(args *PullOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"pull"}, args.Args()...)...)
}

func (s *SealosCmd) ImagePush(image string) error {
	return s.Executor.AsyncExec(s.BinPath, "push", image)
}

func (s *SealosCmd) ImageList() error {
	return s.Executor.AsyncExec(s.BinPath, "list")
}

func (s *SealosCmd) ImageSave(image string, path string, archive string) error {
	if archive == "" {
		return s.Executor.AsyncExec(s.BinPath, "save", "-o", path, image)
	}
	return s.Executor.AsyncExec(s.BinPath, "save", "-o", path, "--format", archive, image)
}

func (s *SealosCmd) ImageMultiSave(path string, name ...string) error {
	param := append([]string{"save", "-m", "--format", "docker-archive", "-o", path}, name...)
	return s.Executor.AsyncExec(s.BinPath, param...)
}

func (s *SealosCmd) ImageLoad(path string) error {
	return s.Executor.AsyncExec(s.BinPath, "load", "-i", path)
}

func (s *SealosCmd) ImageTag(name, newName string) error {
	return s.Executor.AsyncExec(s.BinPath, "tag", name, newName)
}

func (s *SealosCmd) ImageMerge(args *MergeOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"merge"}, args.Args()...)...)
}

func (s *SealosCmd) ImageRemove(images ...string) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"rmi", "-f"}, images...)...)
}

func (s *SealosCmd) ImageInspect(image string) error {
	return s.Executor.AsyncExec(s.BinPath, "inspect", image)
}
func (s *SealosCmd) CRIImageList(display bool) (*ImageStruct, error) {
	if display {
		return nil, s.Executor.AsyncExec(s.CriBinPath, "images")
	}
	data, err := s.Executor.Exec(s.CriBinPath, "images", "-o", "json")
	if err != nil {
		return nil, err
	}
	var image ImageStruct
	err = json.Unmarshal(data, &image)
	if err != nil {
		return nil, err
	}
	return &image, nil
}
func (s *SealosCmd) CRIProcessList(display bool) (*ProcessStruct, error) {
	if display {
		return nil, s.Executor.AsyncExec(s.CriBinPath, "ps", "-a")
	}
	data, err := s.Executor.Exec(s.CriBinPath, "ps", "-a", "-o", "json")
	if err != nil {
		return nil, err
	}
	var process ProcessStruct
	err = json.Unmarshal(data, &process)
	if err != nil {
		return nil, err
	}
	return &process, nil
}
func (s *SealosCmd) CRIPodList(display bool) (*PodStruct, error) {
	if display {
		return nil, s.Executor.AsyncExec(s.CriBinPath, "pods")
	}
	data, err := s.Executor.Exec(s.CriBinPath, "pods", "-o", "json")
	if err != nil {
		return nil, err
	}
	var pod PodStruct
	err = json.Unmarshal(data, &pod)
	if err != nil {
		return nil, err
	}
	return &pod, nil
}
func (s *SealosCmd) CRIImagePull(name string) error {
	return s.Executor.AsyncExec(s.CriBinPath, "pull", name)
}
