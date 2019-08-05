package install

//Send is
type Send interface {
	SendPackage()
}

//PreInit is
type PreInit interface {
	KubeadmConfigInstall()
	InstallMaster0()
}

//Print is
type Print interface {
	Print()
}

//Clean is
type Clean interface {
	Clean()
}

//Join is
type Join interface {
	JoinMasters()
	JoinNodes()
	GeneratorToken()
}
