/** @jest-environment jsdom */

import { driver } from '@sealos/driver';
import { destroyDriver, startQuitGuideDriver } from '@/components/account/driver';
import { useConfigStore } from '@/stores/config';
import { useGuideModalStore } from '@/stores/guideModal';
import type { TFunction } from 'next-i18next';

jest.mock('@sealos/driver', () => ({
  driver: jest.fn()
}));

jest.mock('@sealos/gtm', () => ({
  track: jest.fn()
}));

const mockedDriver = driver as jest.MockedFunction<typeof driver>;
const t = ((key: string) => key) as TFunction;

describe('guide exit driver flag', () => {
  beforeEach(() => {
    destroyDriver();
    jest.clearAllMocks();
    mockedDriver.mockReturnValue({
      destroy: jest.fn(),
      drive: jest.fn()
    } as ReturnType<typeof driver>);
    useConfigStore.setState({ commonConfig: undefined });
    useGuideModalStore.getState().setIsDriverActive(false);
  });

  it('does not point to the guide button when the button is hidden', () => {
    useConfigStore.setState({
      commonConfig: { guideButtonEnabled: false } as NonNullable<
        ReturnType<typeof useConfigStore.getState>['commonConfig']
      >
    });

    expect(startQuitGuideDriver(t)).toBeNull();
    expect(mockedDriver).not.toHaveBeenCalled();
    expect(useGuideModalStore.getState().isDriverActive).toBe(false);
  });

  it('keeps the exit hint enabled when older config omits the flag', () => {
    startQuitGuideDriver(t);

    expect(mockedDriver).toHaveBeenCalledTimes(1);
    expect(useGuideModalStore.getState().isDriverActive).toBe(true);
  });
});
