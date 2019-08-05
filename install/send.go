package install

//SendPackage is
func (s *SealosInstaller) SendPackage() {
	SendPackage(s.PkgUrl, s.Hosts)
}
