package install

//SendPackage is
func (s *SealosInstaller) SendPackage(packName string) {
	SendPackage(s.PkgUrl, s.Hosts, packName)
}
