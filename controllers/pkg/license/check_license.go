package license

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    apierrors "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/apimachinery/pkg/types"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
    licenseGroup      = "license.sealos.io"
    licenseVersion    = "v1"
    licenseKind       = "License"
    licenseListKind   = "LicenseList"
    statusPhaseActive = "Active"
)

var (
    ErrLicenseNotFound = errors.New("license resource not found")
    ErrNoValidLicense  = errors.New("no valid license found")
    licenseGVK         = schema.GroupVersionKind{Group: licenseGroup, Version: licenseVersion, Kind: licenseKind}
    licenseListGVK     = schema.GroupVersionKind{Group: licenseGroup, Version: licenseVersion, Kind: licenseListKind}
)

var DefaultLicense = types.NamespacedName{Name: "default", Namespace: "ns-admin"}

type Result struct {
    Valid     bool
    License   types.NamespacedName
    Phase     string
    Reason    string
    CheckedAt time.Time
}

type Checker struct {
    client client.Client
}

func NewChecker(c client.Client) Checker {
    return Checker{client: c}
}

func CheckLicense(ctx context.Context, c client.Client) (bool, error) {
    res, err := Evaluate(ctx, c)
    if err != nil {
        return false, err
    }
    return res.Valid, nil
}

// Evaluate returns a detailed Result describing the cluster license state.
func Evaluate(ctx context.Context, c client.Client) (Result, error) {
    return NewChecker(c).Evaluate(ctx)
}

func (c Checker) Evaluate(ctx context.Context) (Result, error) {
    if c.client == nil {
        return Result{}, errors.New("license checker: nil client")
    }
    now := time.Now()
    infos, err := c.collect(ctx)
    if err != nil {
        return Result{CheckedAt: now}, err
    }
    if len(infos) == 0 {
        return Result{CheckedAt: now, Reason: "no license resources found"}, ErrLicenseNotFound
    }
    if active, ok := pickActive(infos); ok {
        return Result{
            Valid:     true,
            License:   active.NamespacedName,
            Phase:     active.Phase,
            CheckedAt: now,
        }, nil
    }
    return Result{CheckedAt: now, Reason: summarize(infos)}, ErrNoValidLicense
}

func (c Checker) collect(ctx context.Context) ([]licenseInfo, error) {
    listObj := newLicenseListObject()
    if err := c.client.List(ctx, listObj, client.InNamespace(DefaultLicense.Namespace)); err != nil {
        return nil, err
    }
    if len(listObj.Items) == 0 {
        // fallback to fetching the default license explicitly to return ErrLicenseNotFound
        obj := newLicenseObject()
        if err := c.client.Get(ctx, DefaultLicense, obj); err != nil {
            if apierrors.IsNotFound(err) {
                return nil, fmt.Errorf("%w: %s", ErrLicenseNotFound, DefaultLicense.String())
            }
            return nil, err
        }
        return []licenseInfo{summarizeLicense(obj)}, nil
    }
    infos := make([]licenseInfo, 0, len(listObj.Items))
    for i := range listObj.Items {
        item := listObj.Items[i]
        infos = append(infos, summarizeLicense(&item))
    }
    return infos, nil
}

type licenseInfo struct {
    NamespacedName types.NamespacedName
    Phase          string
    Reason         string
}

func summarizeLicense(obj *unstructured.Unstructured) licenseInfo {
    info := licenseInfo{
        NamespacedName: types.NamespacedName{Namespace: obj.GetNamespace(), Name: obj.GetName()},
        Phase:          "Unknown",
    }
    if phase, ok, err := unstructured.NestedString(obj.Object, "status", "phase"); err == nil && ok && phase != "" {
        info.Phase = phase
    }
    if reason, ok, err := unstructured.NestedString(obj.Object, "status", "reason"); err == nil && ok {
        info.Reason = reason
    }
    return info
}

func pickActive(infos []licenseInfo) (licenseInfo, bool) {
    for _, info := range infos {
        if info.Phase == statusPhaseActive {
            return info, true
        }
    }
    return licenseInfo{}, false
}

func summarize(infos []licenseInfo) string {
    parts := make([]string, 0, len(infos))
    for _, info := range infos {
        var b strings.Builder
        if info.NamespacedName.String() != "" {
            b.WriteString(info.NamespacedName.String())
        }
        if info.Phase != "" {
            if b.Len() > 0 {
                b.WriteRune(' ')
            }
            b.WriteString("phase=")
            b.WriteString(info.Phase)
        }
        if info.Reason != "" {
            if b.Len() > 0 {
                b.WriteRune(' ')
            }
            b.WriteString("reason=")
            b.WriteString(info.Reason)
        }
        parts = append(parts, b.String())
    }
    return strings.Join(parts, "; ")
}

func newLicenseObject() *unstructured.Unstructured {
    obj := &unstructured.Unstructured{}
    obj.SetGroupVersionKind(licenseGVK)
    return obj
}

func newLicenseListObject() *unstructured.UnstructuredList {
    obj := &unstructured.UnstructuredList{}
    obj.SetGroupVersionKind(licenseListGVK)
    return obj
}
