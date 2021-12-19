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
	"github.com/fanux/sealos/pkg/types/v1beta1"
	apiequality "k8s.io/apimachinery/pkg/api/equality"
	apimachineryvalidation "k8s.io/apimachinery/pkg/api/validation"
	"k8s.io/apimachinery/pkg/util/validation/field"
)

// ValidateInfraName validates that the given name can be used as a infra name.
var ValidateInfraName = apimachineryvalidation.NameIsDNSSubdomain

func validateHosts(hosts *v1beta1.Hosts, fldPath *field.Path) field.ErrorList {
	allErrors := field.ErrorList{}
	if hosts.Count == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("count"), hosts.Count,
			"hosts count not set"))
	}
	if hosts.CPU == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("cpu"), hosts.Count,
			"hosts cpu not set"))
	}
	if hosts.Memory == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Key("memory"), hosts.Count,
			"hosts memory not set"))
	}
	if len(hosts.Disks.System) == 0 {
		allErrors = append(allErrors, field.Invalid(fldPath.Child("disks").Key("system"), hosts.Count,
			"hosts system disk not set"))
	}
	return allErrors
}

func ValidateInfra(infra *v1beta1.Infra) field.ErrorList {
	allErrors := apimachineryvalidation.ValidateObjectMeta(&infra.ObjectMeta, false, ValidateInfraName, field.NewPath("metadata"))
	allErrors = append(allErrors, validateInfraSpec(&infra.Spec, field.NewPath("spec"))...)
	return allErrors
}
func validateInfraSpec(spec *v1beta1.InfraSpec, fldPath *field.Path) field.ErrorList {
	allErrors := field.ErrorList{}

	allErrors = append(allErrors, validateHosts(&spec.Masters, fldPath.Child("masters"))...)

	if spec.Nodes != nil {
		allErrors = append(allErrors, validateHosts(spec.Nodes, fldPath.Child("nodes"))...)
	}

	switch spec.Platform {
	case v1beta1.ARM64:
	case v1beta1.AMD64:
	default:
		allErrors = append(allErrors, field.Invalid(fldPath.Key("platform"), spec.Platform,
			"spec platform not support"))
	}

	return allErrors
}
func ValidateInfraUpdate(infra, oldInfra *v1beta1.Infra) field.ErrorList {
	allErrs := apimachineryvalidation.ValidateObjectMetaUpdate(&infra.ObjectMeta, &oldInfra.ObjectMeta, field.NewPath("metadata"))
	newInfraClone := infra.DeepCopy()
	if newInfraClone.Spec.Provider != oldInfra.Spec.Provider {
		allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Key("provider"), "fields can't modify are forbidden"))
	}
	if newInfraClone.Spec.Platform != oldInfra.Spec.Platform {
		allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Key("platform"), "fields can't modify are forbidden"))
	}
	if !apiequality.Semantic.DeepEqual(newInfraClone.Spec.Auth, oldInfra.Spec.Auth) {
		allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Key("auth"), "fields can't modify are forbidden"))
	}
	if !apiequality.Semantic.DeepEqual(newInfraClone.Spec.Masters.Disks, oldInfra.Spec.Masters.Disks) {
		allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Child("masters").Key("disks"), "fields can't modify are forbidden"))
	}
	if newInfraClone.Spec.Nodes != nil && oldInfra.Spec.Nodes != nil {
		if !apiequality.Semantic.DeepEqual(newInfraClone.Spec.Nodes.Disks, oldInfra.Spec.Nodes.Disks) {
			allErrs = append(allErrs, field.Forbidden(field.NewPath("spec").Child("nodes").Key("disks"), "fields can't modify are forbidden"))
		}
	}

	return allErrs
}
