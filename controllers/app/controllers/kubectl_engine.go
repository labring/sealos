package controllers

import (
	"bytes"
	"fmt"
	"html/template"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func (ctlEngine *KubectlEngine) Parse() error {
	actionName := ctlEngine.ActionReq.Spec.ActionName
	tpl := ctlEngine.imageInfo.Spec.DetailInfo.Actions[actionName].Template

	args := ctlEngine.ActionReq.Spec.Args
	t, err := template.New("action.yaml").Parse(tpl)
	if err != nil {
		return fmt.Errorf("action template parse failed")
	}
	var byt bytes.Buffer
	e := t.Execute(&byt, args)
	if e != nil {
		return fmt.Errorf("action template execute failed")
	}
	ctlEngine.parseResult = byt.Bytes()
	return nil
}

func (ctlEngine *KubectlEngine) Apply() error {
	obj := &unstructured.Unstructured{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(ctlEngine.parseResult, nil, obj)
	if err != nil {
		return fmt.Errorf("action template decode failed")
	}
	obj.SetNamespace(DefaultNameSpace)
	oobj, isclientobj := obj.DeepCopyObject().(client.Object)
	if !isclientobj {
		return fmt.Errorf("deepCopyObject errL:%v", err)
	}
	_, err = controllerutil.CreateOrUpdate(ctlEngine.ctx, ctlEngine.Client, oobj, func() error {
		return nil
	})
	if err != nil {
		return fmt.Errorf("createOrUpdate errL:%v", err)
	}

	return nil
}
