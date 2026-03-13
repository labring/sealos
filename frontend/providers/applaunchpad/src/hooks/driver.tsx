import { useGuideStore } from '@/store/guide';
import { driver } from '@sealos/driver';
import { Config } from '@sealos/driver/src/config';
import { track } from '@sealos/gtm';
import { CircleCheckBig, X } from 'lucide-react';
import { TFunction } from 'next-i18next';
import { sealosApp } from 'sealos-desktop-sdk/app';
import Image from 'next/image';

let currentDriver: any = null;

export function startDriver(config: Config) {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }

  if (!useGuideStore.getState().startTimeMs) {
    useGuideStore.setState({
      startTimeMs: Date.now()
    });
  }

  const driverObj = driver(config);
  currentDriver = driverObj;
  driverObj.drive();

  return driverObj;
}

export const applistDriverObj = (t: TFunction, nextStep: () => void): Config => ({
  onPopoverRender() {
    useGuideStore.setState({
      startTimeMs: Date.now()
    });
  },

  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.create-app-btn',
      popover: {
        side: 'left',
        align: 'start',
        borderRadius: '12px 12px 12px 12px',

        PopoverBody: (
          <div className="w-[250px] bg-[#2563EB] p-3 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div className="text-white text-sm font-semibold">{t('driver.create_launchpad')}</div>
              <div
                className="cursor-pointer ml-auto"
                onClick={() => {
                  track('guide_exit', {
                    module: 'guide',
                    guide_name: 'applaunchpad',
                    duration_seconds:
                      (Date.now() - (useGuideStore.getState().startTimeMs ?? Date.now())) / 1000,
                    progress_step: 2
                  });

                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </div>
            </div>
            <div className="mt-2 text-white/80 text-sm font-normal">
              {t('driver.define_settings')}
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="text-gray-900 text-[13px] font-medium">2/4</div>
              <div
                className="text-white text-sm font-medium cursor-pointer rounded-lg bg-white/20 w-fit h-8 px-2 flex items-center justify-center"
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  nextStep();
                }}
              >
                {t('driver.next')}
              </div>
            </div>
          </div>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el._originalOutline = el.style.outline;

      el.style.borderRadius = '8px';
      el.style.outline = '2px solid #1C4EF5';
      el.style.outlineOffset = '2px';

      el.addEventListener(
        'click',
        () => {
          if (currentDriver) {
            currentDriver.destroy();
            currentDriver = null;
          }
        },
        { once: true }
      );
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setListCompleted(true);
  }
});

export const detailDriverObj = (t: TFunction): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '#driver-detail-network',
      popover: {
        side: 'top',
        align: 'center',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <div className="w-[250px] bg-[#2563EB] p-3 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div className="text-white text-sm font-semibold">
                {t('driver.access_application')}
              </div>
              <div
                className="cursor-pointer ml-auto"
                onClick={() => {
                  track('guide_exit', {
                    module: 'guide',
                    guide_name: 'applaunchpad',
                    duration_seconds:
                      (Date.now() - (useGuideStore.getState().startTimeMs ?? Date.now())) / 1000,
                    progress_step: 4
                  });
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </div>
            </div>
            <div className="mt-2 text-white/80 text-sm font-normal">{t('driver.copy_address')}</div>
            <div className="text-white/80 text-sm font-normal">{t('driver.click_anywhere')}</div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-gray-900 text-[13px] font-medium">4/4</div>
              <div
                className="text-white text-sm font-medium cursor-pointer rounded-lg bg-white/20 w-fit h-8 px-2 flex items-center justify-center"
                onClick={() => {
                  track('guide_complete', {
                    module: 'guide',
                    guide_name: 'applaunchpad',
                    duration_seconds:
                      (Date.now() - (useGuideStore.getState().startTimeMs ?? Date.now())) / 1000
                  });

                  startDriver(quitGuideDriverObj(t));
                }}
              >
                {t('driver.next')}
              </div>
            </div>
          </div>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5';

      el.addEventListener(
        'click',
        (e: any) => {
          if (currentDriver) {
            currentDriver.destroy();
            currentDriver = null;
          }
        },
        { once: true }
      );
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
    }
  },
  onDestroyed: (element?: Element) => {
    useGuideStore.getState().setDetailCompleted(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const quitGuideDriverObj = (t: TFunction, nextStep?: () => void): Config => ({
  showProgress: false,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: true,
  overlayColor: 'transparent',

  steps: [
    {
      popover: {
        side: 'bottom',
        align: 'end',
        PopoverBody: (
          <div className="text-black rounded-2xl w-[460px]">
            <div className="w-full rounded-2xl px-6">
              <div>
                <div className="mt-8">
                  <CircleCheckBig size={32} color="#2563EB" />
                </div>
                <div className="my-2 text-black text-xl font-semibold">
                  {t('driver.still_here')}
                </div>
                <div className="mt-2 text-[#404040] text-sm font-normal">
                  {t('driver.find_guide_tip')}
                </div>
                <Image
                  className="mt-5"
                  src="/guide-image.png"
                  alt="guide"
                  width={412}
                  height={300}
                />
              </div>
              <div
                className="mt-5 h-10 rounded-lg border border-[#E4E4E7] bg-white cursor-pointer py-5 px-6 flex items-center justify-center"
                onClick={() => {
                  if (currentDriver) {
                    currentDriver.destroy();
                    currentDriver = null;
                  }
                  window.location.href = '/';
                }}
              >
                {t('driver.create_launchpad')}
              </div>
              <div
                className="mt-3 mb-5 h-10 rounded-lg border border-[#E4E4E7] bg-white cursor-pointer py-5 px-6 flex items-center justify-center"
                onClick={() => {
                  if (currentDriver) {
                    currentDriver.destroy();
                    currentDriver = null;
                  }
                  sealosApp.runEvents('quitGuide', {
                    appKey: 'system-applaunchpad',
                    pathname: '/',
                    messageData: { type: 'InternalAppCall', action: 'quitGuide' }
                  });
                }}
              >
                {t('driver.quit_guide')}
              </div>
            </div>
          </div>
        )
      }
    }
  ],
  onHighlightStarted: (element) => {
    const el = element as any;
    if (el) {
      el._originalBorderRadius = el.style.borderRadius;
      el._originalBorder = el.style.border;
      el.style.borderRadius = '8px';
      el.style.border = '1.5px solid #1C4EF5';
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
    }
  },
  onDestroyed: () => {
    useGuideStore.getState().resetGuideState(true);
    nextStep && nextStep();
  }
});
