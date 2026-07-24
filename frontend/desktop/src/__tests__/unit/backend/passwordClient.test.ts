jest.mock('@/services/request', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}));

import { _passwordLoginRequest } from '@/api/auth';

describe('password login client helper', () => {
  it('initializes workspace and returns a region token in test helper mode', async () => {
    const request = {
      post: jest
        .fn()
        .mockResolvedValueOnce({
          code: 200,
          message: 'Successfully',
          data: {
            token: 'global-token',
            needInit: true
          }
        })
        .mockResolvedValueOnce({
          code: 200,
          message: 'Successfully',
          data: {
            token: 'region-token',
            appToken: 'app-token',
            kubeconfig: 'kubeconfig',
            encodedKubeconfig: 'encoded-kubeconfig'
          }
        })
    };
    const setAuth = jest.fn();

    const result = await _passwordLoginRequest(
      request as any,
      setAuth
    )({
      user: 'alice',
      password: 'testtest'
    });

    expect(request.post).toHaveBeenNthCalledWith(1, '/api/auth/password', {
      user: 'alice',
      password: 'testtest'
    });
    expect(request.post).toHaveBeenNthCalledWith(2, '/api/auth/initRegionToken', {
      workspaceName: ''
    });
    expect(setAuth).toHaveBeenNthCalledWith(1, 'global-token');
    expect(setAuth).toHaveBeenNthCalledWith(2, 'region-token');
    expect(result.data).toEqual({
      token: 'region-token',
      needInit: false
    });
  });
});
