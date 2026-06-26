import { validateProfileUpdate } from '@/services/backend/svc/profile';

describe('profile update validation', () => {
  it('trims nickname and avatar URI', () => {
    const result = validateProfileUpdate({
      nickname: '  Alice  ',
      avatarUri: '  https://example.com/avatar.png  '
    });

    expect(result).toEqual({
      success: true,
      data: {
        nickname: 'Alice',
        avatarUri: 'https://example.com/avatar.png'
      }
    });
  });

  it('accepts empty avatar URI', () => {
    const result = validateProfileUpdate({
      nickname: 'Alice',
      avatarUri: ''
    });

    expect(result).toEqual({
      success: true,
      data: {
        nickname: 'Alice',
        avatarUri: ''
      }
    });
  });

  it('accepts existing relative and data-image avatar values', () => {
    expect(
      validateProfileUpdate({
        nickname: 'Alice',
        avatarUri: '/images/default-user.svg'
      }).success
    ).toBe(true);
    expect(
      validateProfileUpdate({
        nickname: 'Alice',
        avatarUri: 'data:image/png;base64,abc'
      }).success
    ).toBe(true);
  });

  it('accepts existing large data-image avatar values', () => {
    expect(
      validateProfileUpdate({
        nickname: 'Alice',
        avatarUri: `data:image/png;base64,${'a'.repeat(4096)}`
      }).success
    ).toBe(true);
  });

  it('rejects empty nickname and invalid avatar URI', () => {
    expect(validateProfileUpdate(undefined as any)).toEqual({
      success: false,
      message: 'invalid profile data'
    });

    expect(
      validateProfileUpdate({
        nickname: '  ',
        avatarUri: ''
      })
    ).toEqual({ success: false, message: 'nickname is required' });

    expect(
      validateProfileUpdate({
        nickname: 'Alice',
        avatarUri: 'javascript:alert(1)'
      })
    ).toEqual({ success: false, message: 'avatarUri is invalid' });
  });
});
