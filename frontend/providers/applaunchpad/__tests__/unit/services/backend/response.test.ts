import { describe, expect, it } from 'vitest';
import { handleK8sError } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';

describe('handleK8sError', () => {
  it('maps Kubernetes forbidden response bodies to generic insufficient permission errors', () => {
    expect(
      handleK8sError(
        {
          body: {
            kind: 'Status',
            apiVersion: 'v1',
            status: 'Failure',
            code: 403,
            message: 'deployments.apps "demo" is forbidden'
          }
        },
        { forbiddenCode: ResponseCode.FORBIDDEN }
      )
    ).toEqual({
      code: ResponseCode.FORBIDDEN,
      message: ResponseMessages[ResponseCode.FORBIDDEN]
    });
  });

  it('keeps the create-app forbidden code for create flow callers', () => {
    expect(
      handleK8sError({
        body: {
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          code: 403,
          message: 'deployments.apps "demo" is forbidden'
        }
      })
    ).toEqual({
      code: ResponseCode.FORBIDDEN_CREATE_APP,
      message: ResponseMessages[ResponseCode.FORBIDDEN_CREATE_APP]
    });
  });

  it('maps permission text errors even when the Kubernetes status shape was lost', () => {
    expect(
      handleK8sError(new Error('pods "demo" is forbidden: User cannot create resource pods/exec'), {
        forbiddenCode: ResponseCode.FORBIDDEN
      })
    ).toEqual({
      code: ResponseCode.FORBIDDEN,
      message: ResponseMessages[ResponseCode.FORBIDDEN]
    });
  });

  it('maps forbidden response status codes when the body code is missing', () => {
    expect(
      handleK8sError(
        {
          response: { statusCode: 403 },
          body: { message: 'request failed' }
        },
        { forbiddenCode: ResponseCode.FORBIDDEN }
      )
    ).toEqual({
      code: ResponseCode.FORBIDDEN,
      message: ResponseMessages[ResponseCode.FORBIDDEN]
    });
  });

  it('keeps Kubernetes resource conflicts distinct from application name conflicts', () => {
    expect(
      handleK8sError({
        body: {
          kind: 'Status',
          code: 409,
          message: 'services "demo-service" already exists',
          details: { kind: 'services', name: 'demo-service' }
        }
      })
    ).toEqual({
      code: ResponseCode.RESOURCE_ALREADY_EXISTS,
      message: 'services "demo-service" already exists'
    });
  });

  it('keeps workload conflicts mapped to application name conflicts', () => {
    expect(
      handleK8sError({
        body: {
          kind: 'Status',
          code: 409,
          message: 'statefulsets.apps "demo" already exists',
          details: { kind: 'statefulsets', name: 'demo' }
        }
      })
    ).toEqual({
      code: ResponseCode.APP_ALREADY_EXISTS,
      message: ResponseMessages[ResponseCode.APP_ALREADY_EXISTS]
    });
  });

  it('returns immutable-field validation errors without masking them as permissions', () => {
    expect(
      handleK8sError({
        body: {
          kind: 'Status',
          code: 422,
          message: 'StatefulSet spec.serviceName is immutable'
        }
      })
    ).toEqual({
      code: ResponseCode.UNPROCESSABLE_ENTITY,
      message: 'StatefulSet spec.serviceName is immutable'
    });
  });
});
