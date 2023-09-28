import { ConfigMap } from "@/k8slens/kube-object";
import { ItemStore } from "./data.store";
import { Resource } from "../types/types";

export class ConfigMapStore extends ItemStore<ConfigMap> {
  constructor() {
    super(Resource.ConfigMaps);
  }
}
