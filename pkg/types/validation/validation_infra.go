// Copyright © 2021 sealos.
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

package validation

import (
	"strings"

	apiequality "k8s.io/apimachinery/pkg/api/equality"
	apimachineryvalidation "k8s.io/apimachinery/pkg/api/validation"
	"k8s.io/apimachinery/pkg/util/sets"
	"k8s.io/apimachinery/pkg/util/validation/field"

	"github.com/labring/sealos/pkg/types/v1beta1"
	strings2 "github.com/labring/sealos/pkg/utils/strings"
)

// ValidateInfraName validates that the given name can be used as a infra name.
var ValidateInfraName = apimachineryvalidation.NameIsDNSSubdomain

func validateHost(host *v1beta1.InfraHost, fldPath *field.Path) field.ErrorList {
	allErrors := field.ErrorList{}
	if host.Count == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("count"), host.Count,
			"host count not set"))
	}
	if host.CPU == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("cpu"), host.CPU,
			"host cpu not set"))
	}
	if host.Memory == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("memory"), host.Memory,
			"host memory not set"))
	}
	if len(host.Disks) == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("disks"), host.Disks,
			"host disk not set"))
	} else {
		for _, d := range host.Disks {
			if d.Capacity <= 0 {
				allErrors = append(allErrors, field.Invalid(fldPath.Child("disks").Key("capacity"), d.Capacity,
					"host disk capacity not set"))
			}
		}
	}
	switch host.Arch {
	case v1beta1.ARM64:
	case v1beta1.AMD64:
	default:
		allErrors = append(allErrors, field.Invalid(fldPath.Key("arch"), host.Arch,
			"arch not support"))
	}
	return allErrors
}

func validateCluster(cluster *v1beta1.InfraMetadata, fldPath *field.Path) field.ErrorList {
	allErrors := field.ErrorList{}

	if len(cluster.RegionIDs) == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("regionIDs"), cluster.RegionIDs,
			"regionIDs not empty"))
	}
	return allErrors
}

func validateCredential(credential *v1beta1.InfraCredential, fldPath *field.Path) field.ErrorList {
	allErrors := field.ErrorList{}

	if len(credential.AccessKey) == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("accessKey"), credential.AccessKey,
			"accessKey not empty"))
	}
	if len(credential.AccessSecret) == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("accessSecret"), credential.AccessSecret,
			"accessSecret not empty"))
	}
	return allErrors
}

func ValidateInfra(infra *v1beta1.Infra, fun func(infra *v1beta1.Infra) field.ErrorList) field.ErrorList {
	allErrors := apimachineryvalidation.ValidateObjectMeta(&infra.ObjectMeta, false, ValidateInfraName, field.NewPath("metadata"))
	allErrors = append(allErrors, validateInfraSpec(&infra.Spec, field.NewPath("spec"))...)
	allErrors = append(allErrors, fun(infra)...)
	return allErrors
}
func validateInfraSpec(spec *v1beta1.InfraSpec, fldPath *field.Path) field.ErrorList {
	allErrors := field.ErrorList{}
	allErrors = append(allErrors, validateCredential(&spec.Credential, fldPath.Child("credential"))...)
	allErrors = append(allErrors, validateCluster(&spec.Metadata, fldPath.Child("cluster"))...)
	var roles []string
	roleSet := sets.NewString()
	if spec.Hosts != nil {
		for i, h := range spec.Hosts {
			allErrors = append(allErrors, validateHost(&h, fldPath.Child("hosts").Index(i))...)
			roles = append(roles, string(h.ToRole()))
			if !roleSet.Has(strings.Join(h.Roles, ",")) {
				roleSet.Insert(strings.Join(h.Roles, ","))
			} else {
				allErrors = append(allErrors, field.Invalid(fldPath.Child("hosts").Index(i), h,
					"hosts has repeat"))
			}
		}
	} else {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("hosts"), spec.Hosts,
			"hosts not empty"))
	}
	if !strings2.In(v1beta1.Master, roles) {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("hosts"), spec.Hosts,
			"hosts must has role is master"))
	}

	return allErrors
}
func ValidateInfraUpdate(infra, oldInfra *v1beta1.Infra) field.ErrorList {
	allErrs := apimachineryvalidation.ValidateObjectMetaUpdate(&infra.ObjectMeta, &oldInfra.ObjectMeta, field.NewPath("metadata"))
	newInfraClone := infra.DeepCopy()
	if newInfraClone.Spec.Provider != oldInfra.Spec.Provider {
		allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Key("provider"), "fields can't modify are forbidden"))
	}
	if !apiequality.Semantic.DeepEqual(newInfraClone.Spec.Credential, oldInfra.Spec.Credential) {
		allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Key("credential"), "fields can't modify are forbidden"))
	}
	return allErrs
}
