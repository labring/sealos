import { describe, expect, it } from 'vitest';

import enCommon from '../../../public/locales/en/common.json';
import zhCommon from '../../../public/locales/zh/common.json';

describe('pod log time translations', () => {
  it('defines the five-minute option used by LogsModal in both locales', () => {
    expect(zhCommon.within_5_minutes).toBe('五分钟内');
    expect(enCommon.within_5_minutes).toBe('Within 5 minutes');
  });
});
