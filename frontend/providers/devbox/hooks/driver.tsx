import { driver } from '@sealos/driver';
import { X, CircleCheckBig } from 'lucide-react';
import { Config } from '@sealos/driver/src/config';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { useGuideStore } from '@/stores/guide';
import { Button } from '@/components/ui/button';

let currentDriver: any = null;

export const destroyDriver = () => {
  if (currentDriver) {
    currentDriver?.destroy();
    currentDriver = null;
  }
};

export function startDriver(config: Config, openDesktopApp?: any) {
  if (currentDriver) {
    currentDriver.destroy();
    currentDriver = null;
  }

  const driverObj = driver(config);

  currentDriver = driverObj;

  driverObj.drive();
  driverObj.refresh();

  return driverObj;
}

export const startGuide2 = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',
  steps: [
    {
      element: '.list-create-app-button',
      popover: {
        side: 'bottom',
        align: 'end',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <div className="w-[250px] rounded-xl bg-blue-600 p-4 text-white">
            <div className="flex items-center justify-between gap-5">
              <span className="text-sm font-semibold text-white">{t('driver.create_devbox')}</span>
              <div
                className="cursor-pointer rounded-lg p-1"
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X className="h-4 w-4 text-[#7CA1F3]" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-2 text-sm font-normal text-white/80">{t('driver.create_tip')}</div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs font-medium">2/5</div>
              <Button
                className="h-8 w-auto border-none bg-white/20 text-white hover:bg-white/10 hover:text-white"
                variant="outline"
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  nextStep && nextStep();
                }}
              >
                {t('driver.next')}
              </Button>
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
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setGuide2(true);
    currentDriver = null;
  }
});

export const startGuide3 = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',
  steps: [
    {
      element: '.select-runtime-container',
      popover: {
        side: 'bottom',
        align: 'end',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <div className="w-[250px] rounded-xl bg-blue-600 p-4 text-white">
            <div className="flex items-center justify-between gap-5">
              <span className="text-sm font-semibold text-white">{t('driver.select_runtime')}</span>
              <div
                className="cursor-pointer rounded-lg p-1"
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X className="h-4 w-4 text-[#7CA1F3]" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-2 text-sm font-normal text-white/80">
              {t('driver.select_runtime_tip')}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs font-medium">2/5</div>
              <Button
                className="h-8 w-auto border-none bg-white/20 text-white hover:bg-white/10 hover:text-white"
                variant="outline"
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  nextStep && nextStep();
                }}
              >
                {t('driver.next')}
              </Button>
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
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setGuide2(true);
    currentDriver = null;
  }
});

export const startConnectIDE = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: false,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',
  steps: [
    {
      element: '.ide-button',
      popover: {
        side: 'bottom',
        align: 'end',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <div className="w-[250px] rounded-xl bg-blue-600 p-4 text-white">
            <div className="flex items-center justify-between gap-5">
              <span className="text-sm font-semibold text-white">{t('driver.code_in_ide')}</span>
              <div
                className="cursor-pointer rounded-lg p-1"
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X className="h-4 w-4 text-[#7CA1F3]" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-2 text-sm font-normal text-white/80">{t('driver.choose_ide')}</div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs font-medium">5/5</div>
              <Button
                className="h-8 w-auto border-none bg-white/20 text-white hover:bg-white/10 hover:text-white"
                variant="outline"
                onClick={() => {
                  currentDriver.destroy();
                  currentDriver = null;
                  nextStep && nextStep();
                }}
              >
                {t('driver.next')}
              </Button>
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
    }
  },
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onHighlighted: (element?: Element) => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  },
  onDestroyed: () => {
    useGuideStore.getState().setGuide2(true);
    currentDriver = null;
  }
});

// export const startManageAndDeploy = (t: any, nextStep?: () => void): Config => ({
//   showProgress: true,
//   allowClose: false,
//   allowClickMaskNextStep: true,
//   isShowButtons: false,
//   allowKeyboardControl: false,
//   disableActiveInteraction: true,
//   overlayColor: 'transparent',

//   steps: [
//     {
//       element: '.guide-deploy-button',
//       popover: {
//         side: 'left',
//         align: 'start',
//         borderRadius: '12px 12px 12px 12px',
//         PopoverBody: (
//           <div className="w-[250px] rounded-xl bg-blue-600 p-3 text-white">
//             <div className="flex items-center justify-between">
//               <div className="text-sm font-semibold text-white">{t('driver.manage_deploy')}</div>
//               <div
//                 className="ml-auto cursor-pointer"
//                 onClick={() => {
//                   startDriver(quitGuideDriverObj(t));
//                 }}
//               >
//                 <X width={'16px'} height={'16px'} />
//               </div>
//             </div>
//             <div className="mt-2 text-sm font-normal text-white/80">
//               {t('driver.release_prepare')}
//             </div>
//             <div className="mt-4 flex items-center justify-between">
//               <div className="text-xs font-medium text-gray-900">5/5</div>
//               <button
//                 className="flex h-8 w-fit cursor-pointer items-center justify-center rounded-lg bg-white/20 px-2 text-sm font-medium text-white"
//                 onClick={() => {
//                   startDriver(quitGuideDriverObj(t));
//                 }}
//               >
//                 {t('driver.next')}
//               </button>
//             </div>
//           </div>
//         )
//       }
//     }
//   ],
//   onHighlightStarted: (element) => {
//     const el = element as any;
//     if (el) {
//       el._originalBorderRadius = el.style.borderRadius;
//       el._originalBorder = el.style.border;
//       el._originalOutline = el.style.outline;

//       el.style.borderRadius = '8px';
//       el.style.outline = '2px solid #1C4EF5';
//       el.style.outlineOffset = '2px';
//     }
//   },
//   onHighlighted: (element) => {},
//   onDeselected: (element?: Element) => {
//     if (element) {
//       const el = element as any;
//       el.style.borderRadius = '';
//       el.style.border = '';
//       el.style.outline = '';
//       el.style.outlineOffset = '';
//     }
//   },
//   onDestroyed: () => {
//     useGuideStore.getState().setManageAndDeploy(true);
//     startDriver(quitGuideDriverObj(t));
//   }
// });

export const startGuideRelease = (t: any, nextStep?: () => void): Config => ({
  showProgress: true,
  allowClose: false,
  allowClickMaskNextStep: true,
  isShowButtons: false,
  allowKeyboardControl: false,
  disableActiveInteraction: false,
  overlayColor: 'transparent',

  steps: [
    {
      element: '.guide-release-button',
      popover: {
        side: 'top',
        align: 'end',
        borderRadius: '12px 12px 12px 12px',
        PopoverBody: (
          <div className="w-[250px] rounded-xl bg-blue-600 p-3 text-white">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">{t('driver.manage_deploy')}</div>
              <div
                className="ml-auto cursor-pointer"
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </div>
            </div>
            <div className="mt-2 text-sm font-normal text-white/80">
              {t('driver.click_release')}
            </div>
            <div className="text-sm font-normal text-white/80">{t('driver.click_anywhere')}</div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs font-medium text-white">5/5</div>
              <Button
                className="h-8 w-auto border-none bg-white/20 text-white hover:bg-white/10 hover:text-white"
                variant="outline"
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                {t('driver.quit_guide')}
              </Button>
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
  onDeselected: (element?: Element) => {
    if (element) {
      const el = element as any;
      el.style.borderRadius = el._originalBorderRadius || '';
      el.style.border = el._originalBorder || '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  },
  onDestroyed: () => {
    useGuideStore.getState().setGuideRelease(true);
    startDriver(quitGuideDriverObj(t));
  }
});

export const quitGuideDriverObj = (t: any, nextStep?: () => void): Config => ({
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
          <div className="w-[460px] rounded-2xl text-black">
            <div className="relative w-full rounded-2xl px-6">
              <div>
                <div className="mt-8">
                  <CircleCheckBig size={32} color="#2563EB" />
                </div>
                <div className="my-2 text-xl font-semibold text-black">
                  {t('driver.still_here')}
                </div>
                <div className="mt-2 text-sm font-normal text-[#404040]">
                  {t('driver.find_guide_tip')}
                </div>
                <img className="mt-5" src={'/guide-image.png'} alt="guide" />
              </div>
              <div
                className="mt-5 flex h-10 cursor-pointer items-center justify-center rounded-lg border border-[#E4E4E7] bg-white px-6 py-5"
                onClick={() => {
                  if (currentDriver) {
                    currentDriver.destroy();
                    currentDriver = null;
                  }
                  window.location.href = '/';
                }}
              >
                {t('driver.create_devbox')}
              </div>
              <div
                className="mt-3 mb-5 flex h-10 cursor-pointer items-center justify-center rounded-lg border border-[#E4E4E7] bg-white px-6 py-5"
                onClick={() => {
                  if (currentDriver) {
                    currentDriver.destroy();
                    currentDriver = null;
                  }
                  sealosApp.runEvents('quitGuide', {
                    appKey: 'system-devbox',
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
      el._originalOutline = el.style.outline;

      el.style.borderRadius = '8px';
      el.style.outline = '2px solid #1C4EF5';
      el.style.outlineOffset = '2px';
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
  onDestroyed: () => {
    console.log('onDestroyed quitGuideDriverObj');
    useGuideStore.getState().resetGuideState(true);
    nextStep && nextStep();
  }
});
