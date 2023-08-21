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
	"os"
	"sync"
	"time"
)

type task string

// A interface for options to implement read-only access.
type Options interface {
	GetPolicy(name task) string
	GetPeriod(name task) time.Duration
	GetDefaultPeriod() time.Duration
	GetEnvOptions() EnvOptions
	GetRunnableOptions() RunnableOptions
	GetDBOptions() DBOptions
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

// The OperatorOptions struct is used to make configuration options available to
// licenseissuer operators.
type OperatorOptions struct {
	// The EnvOptions is used to store environment variables.
	EnvOptions EnvOptions
	// The DBOptions is used to store options for the database.
	DBOptions DBOptions
	// The RunnableOptions is used to store options for the Runnable instance
	RunnableOptions RunnableOptions
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

func NewOptions() *OperatorOptions {
	o := &OperatorOptions{}
	o.initOptions()
	return o
}

func (o *OperatorOptions) initOptions() {
	o.EnvOptions.initOptions()
	o.RunnableOptions.initOptions()
	o.DBOptions.initOptions()

	o.RunnableOptions.Policy[Init] = OncePolicy
	if o.EnvOptions.MonitorConfiguration == "true" {
		//allow developer to choose the policy and period of the task
		o.RunnableOptions.Policy[Collector] = PeriodicPolicy
		o.RunnableOptions.Period[Collector] = 8 * time.Hour
		o.RunnableOptions.Policy[DataSync] = PeriodicPolicy
		o.RunnableOptions.Period[DataSync] = 1 * time.Hour
		o.RunnableOptions.Policy[Notice] = PeriodicPolicy
		o.RunnableOptions.Period[Notice] = 3 * time.Hour
		o.RunnableOptions.Policy[NoticeCleanup] = PeriodicPolicy
		o.RunnableOptions.Period[NoticeCleanup] = 24 * time.Hour
		// Add more tasks Policy and Period here
	}
}

// The EnvOptions is used to store environment variables.
type EnvOptions struct {
	// NetworkConfiguration is used to distinguish between
	// external and internal networks.
	NetworkConfiguration string

	MonitorConfiguration string
	// The MongoURI is used to connect to the MongoDB database.
	MongoURI string

	// The SaltKey is used to encrypt the password for pre-registered users.
	SaltKey string

	// Namespace
	Namespace string
}

func (eo *EnvOptions) initOptions() {
	eo.NetworkConfiguration = os.Getenv("CAN_CONNECT_TO_EXTERNAL_NETWORK")
	eo.MonitorConfiguration = os.Getenv("MONITOR")
	eo.MongoURI = os.Getenv("MONGO_URI")
	eo.SaltKey = os.Getenv("PASSWORD_SALT")
	eo.Namespace = os.Getenv("NAMESPACE")
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

const (
	Collector     task = "Collector"
	DataSync      task = "DataSync"
	Init          task = "Init"
	Notice        task = "Notice"
	NoticeCleanup task = "NoticeCleanup"
	// Add more tasks here
)

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
