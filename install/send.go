package install

//SendPackage is
func (s *SealosInstaller) SendPackage(packName string) {
	SendPackage(PkgUrl, s.Hosts, packName)
}
