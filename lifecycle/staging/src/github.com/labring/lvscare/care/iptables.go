// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package care

import (
	"errors"
	"fmt"
	"time"

	"k8s.io/apimachinery/pkg/util/wait"
	utilsysctl "k8s.io/component-helpers/node/util/sysctl"
	proxyipvs "k8s.io/kubernetes/pkg/proxy/ipvs"
	utilipset "k8s.io/kubernetes/pkg/util/ipset"
	utiliptables "k8s.io/kubernetes/pkg/util/iptables"
	"k8s.io/utils/exec"

	"github.com/labring/sealos/pkg/utils/logger"
)

type iptablesImpl struct {
	ipset    utilipset.Interface
	iptables utiliptables.Interface
	nl       proxyipvs.NetLinkHandle
	sysctl   utilsysctl.Interface

	bindAddresses  []string
	virtualEntries []string
	ifaceName      string
	masqueradeMark string
}

const (
	virtualIPSet        = "VIRTUAL-IP"
	virtualIPSetComment = "virtual service ip + port for masquerade purpose"
)

const (
	virtualServicesChain    utiliptables.Chain = "VIRTUAL-SERVICES"
	virtualPostroutingChain utiliptables.Chain = "VIRTUAL-POSTROUTING"
	virtualMarkMasqChain    utiliptables.Chain = "VIRTUAL-MARK-MASQ"
)

const (
	sysctlVSConnTrack = "net/ipv4/vs/conntrack"
)

var iptablesJumpChain = []struct {
	table   utiliptables.Table
	from    utiliptables.Chain
	to      utiliptables.Chain
	comment string
}{
	{utiliptables.TableNAT, utiliptables.ChainOutput, virtualServicesChain, "virtual service portals"},
	{utiliptables.TableNAT, utiliptables.ChainPrerouting, virtualServicesChain, "virtual service portals"},
	{utiliptables.TableNAT, utiliptables.ChainPostrouting, virtualPostroutingChain, "virtual service postrouting rules"},
}

var iptablesChains = []struct {
	table utiliptables.Table
	chain utiliptables.Chain
}{
	{utiliptables.TableNAT, virtualServicesChain},
	{utiliptables.TableNAT, virtualPostroutingChain},
	{utiliptables.TableNAT, virtualMarkMasqChain},
}

var ipsetInfo = []struct {
	name    string
	setType utilipset.Type
	comment string
}{
	{virtualIPSet, utilipset.HashIPPort, virtualIPSetComment},
}

func newIptablesImpl(iface string, masqueradeBit int, virtualIPs ...string) (Ruler, error) {
	bindAddresses := make([]string, 0)
	virtualEntries := make([]string, 0)
	for i := range virtualIPs {
		host, port, err := splitHostPort(virtualIPs[i])
		if err != nil {
			return nil, err
		}
		bindAddresses = append(bindAddresses, host)
		entry := &utilipset.Entry{
			IP:       host,
			Port:     int(port),
			Protocol: "tcp",
			SetType:  utilipset.HashIPPort,
		}
		virtualEntries = append(virtualEntries, entry.String())
	}

	masqueradeValue := 1 << uint(masqueradeBit)

	execer := exec.New()
	return &iptablesImpl{
		ipset:          utilipset.New(execer),
		iptables:       utiliptables.New(execer, utiliptables.ProtocolIPv4),
		nl:             proxyipvs.NewNetLinkHandle(false),
		sysctl:         utilsysctl.New(),
		bindAddresses:  bindAddresses,
		virtualEntries: virtualEntries,
		ifaceName:      iface,
		masqueradeMark: fmt.Sprintf("%#08x", masqueradeValue),
	}, nil
}

func (impl *iptablesImpl) Setup() error {
	if err := ensureSysctl(impl.sysctl, sysctlVSConnTrack, 1); err != nil {
		logger.Error("Failed to ensure sysctl %s: %v", sysctlVSConnTrack, err)
		return err
	}
	if err := ensureDummyDeviceAndAddresses(impl.nl, impl.ifaceName, impl.bindAddresses...); err != nil {
		logger.Error("Failed to ensure dummy device: %v", err)
		return err
	}
	if err := impl.ensureIpset(); err != nil {
		logger.Error("Failed to ensure ipset: %v", err)
		return err
	}
	err := impl.ensureIptablesChains()
	if err == nil {
		go impl.iptables.Monitor(utiliptables.Chain("VIRTUAL-CANARY"),
			[]utiliptables.Table{utiliptables.TableFilter, utiliptables.TableNAT},
			func() {
				logger.Info("looks like canary rules has been flushed, rebuild it")
				if err := impl.ensureIptablesChains(); err != nil {
					logger.Error("Failed to ensure iptables chains: %v", err)
				}
			},
			time.Minute, wait.NeverStop /*todo: graceful shutdown*/)
	}
	return err
}

func (impl *iptablesImpl) Cleanup() error {
	if encounteredError := impl.cleanupLeftovers(); encounteredError {
		return errors.New("encountered an error while tearing down rules")
	}
	return nil
}

func (impl *iptablesImpl) cleanupLeftovers() (encounteredError bool) {
	logger.Info("Deleting dummy device %s", impl.ifaceName)
	if err := impl.nl.DeleteDummyDevice(impl.ifaceName); err != nil {
		logger.Error("Error deleting dummy device: %v", err)
		encounteredError = true
	}
	logger.Info("Cleanup IPTables rules")
	encounteredError = impl.cleanupIptablesLeftovers() || encounteredError
	for _, set := range ipsetInfo {
		logger.Info("Destroying ipset %s", set.name)
		err := impl.ipset.DestroySet(set.name)
		if err != nil {
			if !utilipset.IsNotFoundError(err) {
				logger.Error("Error removing ipset %s: %v", set.name, err)
				encounteredError = true
			}
		}
	}
	return encounteredError
}

// EnsureSysctl sets a kernel sysctl to a given numeric value.
func ensureSysctl(sysctl utilsysctl.Interface, name string, newVal int) error {
	if oldVal, _ := sysctl.GetSysctl(name); oldVal != newVal {
		if err := sysctl.SetSysctl(name, newVal); err != nil {
			return fmt.Errorf("can't set sysctl %s to %d: %v", name, newVal, err)
		}
		logger.Debug("changed sysctl %s: before %d, after: %d", name, oldVal, newVal)
	}
	return nil
}

func ensureDummyDeviceAndAddresses(nl proxyipvs.NetLinkHandle, ifaceName string, addresses ...string) error {
	if _, err := nl.EnsureDummyDevice(ifaceName); err != nil {
		return err
	}
	for i := range addresses {
		if _, err := nl.EnsureAddressBind(addresses[i], ifaceName); err != nil {
			return err
		}
	}
	return nil
}

func (impl *iptablesImpl) ensureIpset() error {
	for _, set := range ipsetInfo {
		entries := make([]string, 0)
		if set.name == virtualIPSet {
			entries = append(entries, impl.virtualEntries...)
		}
		if err := ensureIPSetWithEntries(impl.ipset, set.name, set.comment, set.setType, entries...); err != nil {
			return err
		}
	}
	return nil
}

type iptablesRule struct {
	position utiliptables.RulePosition
	table    utiliptables.Table
	chain    utiliptables.Chain
	args     []string
}

func (impl *iptablesImpl) extraChainRules() []iptablesRule {
	rules := make([]iptablesRule, 0)
	rules = append(rules, iptablesRule{
		// use `-I`, ACCEPT for packets those marked in filter table at the very first
		// CNI rules MUST always behind it, for example,
		// cilium should configured with `prepend-iptables-chains: false`
		position: utiliptables.Prepend,
		table:    utiliptables.TableFilter,
		chain:    utiliptables.ChainOutput,
		args: []string{
			"-m", "comment", "--comment", `accept for all marked by ` + appName,
			"-m", "mark", "--mark", impl.masqueradeMark,
			"-j", "ACCEPT",
		},
	})
	return rules
}

func (impl *iptablesImpl) ensureIptablesChains() error {
	// service chain
	for _, ch := range iptablesChains {
		if _, err := impl.iptables.EnsureChain(ch.table, ch.chain); err != nil {
			logger.Error("Failed to ensure chain, table: %s, chain: %s, %v", ch.table, ch.chain, err)
			return err
		}
	}
	// jump chain
	for _, jc := range iptablesJumpChain {
		args := []string{"-m", "comment", "--comment", jc.comment, "-j", string(jc.to)}
		if _, err := impl.iptables.EnsureRule(utiliptables.Append, jc.table, jc.from, args...); err != nil {
			logger.Error("Failed to ensure chain jumps, table: %s, src: %s, dst: %s, %v", jc.table, jc.from, jc.to, err)
		}
	}

	rules := []iptablesRule{
		// match ipset
		{
			utiliptables.Append, utiliptables.TableNAT, virtualServicesChain, []string{
				"-m", "comment", "--comment", virtualIPSetComment,
				"-m", "set", "--match-set", virtualIPSet,
				"dst,dst", "-j", string(virtualMarkMasqChain),
			},
		},
		// do masq for marked
		{
			utiliptables.Append, utiliptables.TableNAT, virtualMarkMasqChain, []string{
				"-j", "MARK", "--or-mark", impl.masqueradeMark,
			},
		},
		// RETURN directly for packets those didn't marked
		{
			utiliptables.Append, utiliptables.TableNAT, virtualPostroutingChain, []string{
				"-m", "mark", "!", "--mark", impl.masqueradeMark, "-j", "RETURN",
			},
		},
	}
	rules = append(rules, impl.extraChainRules()...)
	masqArgs := []string{
		"-m", "comment", "--comment", `virtual service traffic requiring SNAT`,
		"-j", "MASQUERADE",
	}
	if impl.iptables.HasRandomFully() {
		masqArgs = append(masqArgs, "--random-fully")
	}
	rules = append(rules, iptablesRule{utiliptables.Append, utiliptables.TableNAT, virtualPostroutingChain, masqArgs})
	for i := range rules {
		if _, err := impl.iptables.EnsureRule(rules[i].position, rules[i].table, rules[i].chain, rules[i].args...); err != nil {
			return err
		}
	}
	return nil
}

func ensureIPSetWithEntries(handle utilipset.Interface, name, comment string, setType utilipset.Type, entries ...string) error {
	set := utilipset.IPSet{
		Name:       name,
		SetType:    setType,
		HashFamily: utilipset.ProtocolFamilyIPV4,
		Comment:    comment,
	}
	if err := handle.CreateSet(&set, true); err != nil {
		return err
	}
	for i := range entries {
		if err := handle.AddEntry(entries[i], &set, true); err != nil {
			return err
		}
	}
	return nil
}

func (impl *iptablesImpl) cleanupIptablesLeftovers() (encounteredError bool) {
	// Unlink the iptables chains created by ipvs Proxier
	for _, jc := range iptablesJumpChain {
		args := []string{
			"-m", "comment", "--comment", jc.comment,
			"-j", string(jc.to),
		}
		if err := impl.iptables.DeleteRule(jc.table, jc.from, args...); err != nil {
			if !utiliptables.IsNotFoundError(err) {
				logger.Error("Error removing iptables rules: %v", err)
				encounteredError = true
			}
		}
	}
	for _, rule := range impl.extraChainRules() {
		if err := impl.iptables.DeleteRule(rule.table, rule.chain, rule.args...); err != nil {
			if !utiliptables.IsNotFoundError(err) {
				logger.Error("Error removing iptables rules: %v", err)
				encounteredError = true
			}
		}
	}

	// Flush and remove all of our chains. Flushing all chains before removing them also removes all links between chains first.
	for _, ch := range iptablesChains {
		if err := impl.iptables.FlushChain(ch.table, ch.chain); err != nil {
			if !utiliptables.IsNotFoundError(err) {
				logger.Error("Error removing iptables rules: %v", err)
				encounteredError = true
			}
		}
	}

	// Remove all of our chains.
	for _, ch := range iptablesChains {
		if err := impl.iptables.DeleteChain(ch.table, ch.chain); err != nil {
			if !utiliptables.IsNotFoundError(err) {
				logger.Error("Error removing iptables rules: %v", err)
				encounteredError = true
			}
		}
	}

	return encounteredError
}
