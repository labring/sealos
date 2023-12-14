import { KubeObject } from '../kube-resource';

/**
 * Basic API query
 *
 * @example
 * For a Pod resource called "nginx"
 * ```ts
 * const query = {kind: "Pod", name: "nginx"}
 * ```
 */
type KubeQuery = {
  kind: string;
  name: string;
};

type WatchQuery = Merge<
  Optional<KubeQuery, 'name'>,
  {
    resourceVersion: string;
  }
>;
type WatchResponse = SuccessResponse<WatchEvent<KubeObject>> | ErrorResponse;

type TemplateQuery = {
  kind: string;
};
type TemplateResponse = SuccessResponse<string> | ErrorResponse;

type ListQuery = Merge<
  Omit<KubeQuery, 'name'>,
  {
    limit?: number;
  }
>;
type ListResponse = SuccessResponse<KubeList<KubeObject>> | ErrorResponse;

type UpdateQuery = KubeQuery;
type UpdateResponse = SuccessResponse<KubeObject> | ErrorResponse;

type CreateQuery = Omit<KubeQuery, 'name'>;
type CreateResponse = SuccessResponse<KubeObject> | ErrorResponse;

type DeleteQuery = KubeQuery;
type DeleteResponse = SuccessResponse<KubeObject> | ErrorResponse;
