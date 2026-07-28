import { getGuideButtonEnabled } from '@/pages/api/platform/getCommonConfig';

describe('guide button environment flag', () => {
  it('defaults to enabled', () => {
    expect(getGuideButtonEnabled(undefined)).toBe(true);
  });

  it('is disabled only by an explicit false value', () => {
    expect(getGuideButtonEnabled('false')).toBe(false);
    expect(getGuideButtonEnabled(' FALSE ')).toBe(false);
    expect(getGuideButtonEnabled('true')).toBe(true);
  });
});
