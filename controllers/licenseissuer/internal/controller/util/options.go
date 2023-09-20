/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package util

import (
	"encoding/base64"
	"os"
	"sync"
	"time"
)

type task string

// A interface for options to implement read-only access.
type Options interface {
	OptionsReadOnly
	OptionsReadWrite
}

type OptionsReadOnly interface {
	GetPolicy(name task) string
	GetPeriod(name task) time.Duration
	GetDefaultPeriod() time.Duration
	GetEnvOptions() EnvOptions
	GetNetWorkOptions() NetWorkOptions
	GetRunnableOptions() RunnableOptions
	GetDBOptions() DBOptions
}

type OptionsReadWrite interface {
	SetNetworkConfig(flag bool)
}

// a singleton instance of Options
var options Options
var once sync.Once

// GetOptions returns the singleton instance of Options.
func GetOptions() Options {
	once.Do(func() {
		options = NewOptions()
	})
	return options
}

// GetOptionsReadOnly returns the singleton instance of OptionsReadOnly.
func GetOptionsReadOnly() OptionsReadOnly {
	return GetOptions()
}

// GetOptionsReadWrite returns the singleton instance of OptionsReadWrite.
func GetOptionsReadWrite() OptionsReadWrite {
	return GetOptions()
}

// The OperatorOptions struct is used to make configuration options available to
// licenseissuer operators.
type OperatorOptions struct {
	// The EnvOptions is used to store environment variables.
	EnvOptions EnvOptions
	// The DBOptions is used to store options for the database.
	DBOptions DBOptions
	// The RunnableOptions is used to store options for the Runnable instance
	RunnableOptions RunnableOptions
	// The NetWorkOptions is used to store options for the NetWork instance
	NetWorkOptions NetWorkOptions
}

func (o *OperatorOptions) SetNetworkConfig(flag bool) {
	o.NetWorkOptions.EnableExternalNetWork = flag
}

func (o *OperatorOptions) GetPolicy(tkname task) string {
	return o.RunnableOptions.Policy[tkname]
}

func (o *OperatorOptions) GetPeriod(tkname task) time.Duration {
	if o.GetPolicy(tkname) == "Once" {
		return 0
	}
	if o.RunnableOptions.Period[tkname] == 0 {
		return o.RunnableOptions.DefaultPeriod
	}
	return o.RunnableOptions.Period[tkname]
}

func (o *OperatorOptions) GetEnvOptions() EnvOptions {
	return o.EnvOptions
}

func (o *OperatorOptions) GetDefaultPeriod() time.Duration {
	return o.RunnableOptions.DefaultPeriod
}

func (o *OperatorOptions) GetRunnableOptions() RunnableOptions {
	return o.RunnableOptions
}

func (o *OperatorOptions) GetDBOptions() DBOptions {
	return o.DBOptions
}
func (o *OperatorOptions) GetNetWorkOptions() NetWorkOptions {
	return o.NetWorkOptions
}

func NewOptions() *OperatorOptions {
	o := &OperatorOptions{}
	o.initOptions()
	return o
}

func (o *OperatorOptions) initOptions() {
	o.EnvOptions.initOptions()
	o.RunnableOptions.initOptions()
	o.DBOptions.initOptions()
	o.NetWorkOptions.initOptions()

	// allow developer to choose the policy and period of the task
	o.RunnableOptions.Policy[Init] = OncePolicy
	o.RunnableOptions.Period[Init] = 0

	o.RunnableOptions.Policy[Collector] = PeriodicWithProbePolicy
	o.RunnableOptions.Period[Collector] = 8 * time.Hour

	o.RunnableOptions.Policy[DataSync] = PeriodicWithProbePolicy
	o.RunnableOptions.Period[DataSync] = 1 * time.Hour

	o.RunnableOptions.Policy[Notice] = PeriodicWithProbePolicy
	o.RunnableOptions.Period[Notice] = 3 * time.Hour

	o.RunnableOptions.Policy[NoticeCleanup] = PeriodicPolicy
	o.RunnableOptions.Period[NoticeCleanup] = 24 * time.Hour

	o.RunnableOptions.Policy[NetWorkConfig] = PeriodicPolicy
	o.RunnableOptions.Period[NetWorkConfig] = 30 * time.Minute

	o.RunnableOptions.Policy[Register] = OnceWithProbePolicy
	o.RunnableOptions.Period[Register] = 5 * time.Minute

	o.RunnableOptions.Policy[MemoryCleanup] = PeriodicPolicy
	o.RunnableOptions.Period[MemoryCleanup] = 30 * time.Minute

	o.RunnableOptions.Policy[ClusterBillingWork] = PeriodicWithProbePolicy
	o.RunnableOptions.Period[ClusterBillingWork] = 8 * time.Hour

	o.RunnableOptions.Policy[ClusterBillingMonitor] = PeriodicPolicy
	o.RunnableOptions.Period[ClusterBillingMonitor] = 24 * time.Hour
	// Add more tasks Policy and Period here
}

// The EnvOptions is used to store environment variables.
type EnvOptions struct {

	// The MongoURI is used to connect to the MongoDB database.
	MongoURI string

	// The SaltKey is used to encrypt the password for pre-registered users.
	SaltKey string

	// Namespace
	Namespace string

	// License Policy
	BillingPolicy string

	// The IssuerKey is used to identify the issuer of the license.
	IssuerKey string
}

func (eo *EnvOptions) initOptions() {
	eo.MongoURI = os.Getenv("MONGO_URI")
	eo.SaltKey = os.Getenv("PASSWORD_SALT")
	eo.Namespace = os.Getenv("NAMESPACE")
	eo.BillingPolicy = os.Getenv("BILLING_POLICY")
	key, err := base64.StdEncoding.DecodeString(os.Getenv("ISSUER_KEY"))
	if err != nil {
		eo.IssuerKey = ""
	} else {
		eo.IssuerKey = string(key)
	}
}

type RunnableOptions struct {
	// The Policy is configured the task of framework.
	// --> Once: The task is executed only once.
	// --> Periodic: The task is executed periodically.
	Policy map[task]string
	// The Period is configured the period of the task
	// if empty, use the default period.
	Period        map[task]time.Duration
	DefaultPeriod time.Duration
}

type NetWorkOptions struct {
	// EnableExternalNetWork is used to distinguish between
	// external and internal networks.
	EnableExternalNetWork bool
}

func (no *NetWorkOptions) initOptions() {
	no.EnableExternalNetWork = false
}

func (ro *RunnableOptions) initOptions() {
	ro.Policy = make(map[task]string)
	ro.Period = make(map[task]time.Duration)
	ro.DefaultPeriod = 1 * time.Hour
}

type DBOptions struct {
	// The MongoOptions is used to store options for the MongoDB database.
	MongoOptions MongoOptions
}

func (do *DBOptions) initOptions() {
	do.MongoOptions.initOptions()
}

type MongoOptions struct {
	// The MongoURI is used to connect to the MongoDB database.
	MongoURI string
	// The UserDB is the db reference of the MongoDB database.
	UserDB string
	// The UserCol is the collection of the UserDB to store user information.
	UserCol string
}

func (mo *MongoOptions) initOptions() {
	mo.MongoURI = os.Getenv("MONGO_URI")
	mo.UserDB = os.Getenv("MONGO_USER_DB")
	mo.UserCol = os.Getenv("MONGO_USER_COL")
}
