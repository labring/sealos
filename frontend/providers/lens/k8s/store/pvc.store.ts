import { PersistentVolumeClaim } from "@/k8slens/kube-object";
import { ItemStore } from "./data.store";
import { Resource } from "../types/types";

export class PersistentVolumeClaimStore extends ItemStore<PersistentVolumeClaim> {
  constructor() {
    super(Resource.PersistentVolumeClaims);
  }
}
