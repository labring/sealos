package cmd

import "strings"

type SealosCmd struct {
	BinPath  string
	Executor Interface
	ImageService
	ClusterCycle
}

func NewSealosCmd(binPath string, executor Interface) *SealosCmd {
	return &SealosCmd{
		BinPath:  binPath,
		Executor: executor,
	}
}

type ClusterCycle interface {
	Apply(*ApplyOptions) error
	Build(*BuildOptions) error
	Create(*CreateOptions) error
	Add(*AddOptions) error
	Delete(*DeleteOptions) error
	Run(*RunOptions) error
	Reset(*ResetOptions) error
	Cert(*CertOptions) error
}

type ImageService interface {
	ImagePull(image string) error
	ImagePush(image string) error
	ImageList() error
	ImageSave(image string, path string) error
	ImageLoad(path string) error
	ImageMerge(mergeName string, imageList []string) error
	ImageRemove(image string) error
	ImageInspect(image string) error
}

func (s *SealosCmd) Apply(args *ApplyOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"apply"}, args.Args()...)...)
}

func (s *SealosCmd) Build(args *BuildOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"build"}, args.Args()...)...)
}

func (s *SealosCmd) Create(args *CreateOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"create"}, args.Args()...)...)
}

func (s *SealosCmd) Add(args *AddOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"add"}, args.Args()...)...)
}

func (s *SealosCmd) Delete(args *DeleteOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"delete"}, args.Args()...)...)
}

func (s *SealosCmd) Run(args *RunOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"run"}, args.Args()...)...)
}

func (s *SealosCmd) Reset(args *ResetOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"reset"}, args.Args()...)...)
}

func (s *SealosCmd) Cert(args *CertOptions) error {
	return s.Executor.AsyncExec(s.BinPath, append([]string{"cert"}, args.Args()...)...)
}

func (s *SealosCmd) ImagePull(image string) error {
	return s.Executor.AsyncExec(s.BinPath, "pull", image)
}

func (s *SealosCmd) ImagePush(image string) error {
	return s.Executor.AsyncExec(s.BinPath, "push", image)
}

func (s *SealosCmd) ImageList() error {
	return s.Executor.AsyncExec(s.BinPath, "list")
}

func (s *SealosCmd) ImageSave(image string, path string) error {
	return s.Executor.AsyncExec(s.BinPath, "save", image, "-o", path)
}

func (s *SealosCmd) ImageLoad(path string) error {
	return s.Executor.AsyncExec(s.BinPath, "load", "-i", path)
}

func (s *SealosCmd) ImageMerge(mergeName string, imageList []string) error {
	return s.Executor.AsyncExec(s.BinPath, "merge", "-t", mergeName, strings.Join(imageList, " "))
}

func (s *SealosCmd) ImageRemove(image string) error {
	return s.Executor.AsyncExec(s.BinPath, "remove", image)
}

func (s *SealosCmd) ImageInspect(image string) error {
	return s.Executor.AsyncExec(s.BinPath, "inspect", image)
}
