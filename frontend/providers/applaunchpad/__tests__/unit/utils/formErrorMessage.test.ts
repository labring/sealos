import { describe, expect, it } from 'vitest';
import { getSubmitErrorMessage } from '@/utils/formErrorMessage';

describe('getSubmitErrorMessage', () => {
  it('maps form invalid placeholders to the localized validation message', () => {
    expect(
      getSubmitErrorMessage(
        {
          appName: {
            type: 'pattern',
            message: 'invalid'
          }
        },
        'Submit Error',
        'Invalid name'
      )
    ).toBe('Invalid name');
  });

  it('keeps specific nested form error messages', () => {
    expect(
      getSubmitErrorMessage(
        {
          imageName: {
            message: 'Image name cannot be empty'
          }
        },
        'Submit Error',
        'Invalid name'
      )
    ).toBe('Image name cannot be empty');
  });

  it('falls back when no field error message exists', () => {
    expect(getSubmitErrorMessage({}, 'Submit Error', 'Invalid name')).toBe('Submit Error');
  });
});
