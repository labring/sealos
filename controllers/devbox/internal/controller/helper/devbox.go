package helper

import devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"

func GetLastSuccessCommitHistory(devbox *devboxv1alpha1.Devbox) *devboxv1alpha1.CommitHistory {
	if devbox.Status.CommitHistory == nil {
		return nil
	}
	for i := len(devbox.Status.CommitHistory) - 1; i >= 0; i-- {
		if devbox.Status.CommitHistory[i].Status == devboxv1alpha1.CommitStatusSuccess {
			return devbox.Status.CommitHistory[i].DeepCopy()
		}
	}
	return nil
}
