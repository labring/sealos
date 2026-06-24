import type { AppEditType } from '@/types/app';
import {
  cpuMillicoresToQuantity,
  memoryMiToQuantity,
  quantityFromJSONOrZero,
  storageAnnotationToQuantity,
  storageGiToQuantity
} from '@/utils/resourceQuantity';
import { Quantity } from '@sealos/shared';

const isNumericString = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim());

export const hydrateLegacyAppForm = (appForm: AppEditType): AppEditType => ({
  ...appForm,
  cpu:
    appForm.cpu instanceof Quantity
      ? appForm.cpu
      : typeof appForm.cpu === 'number'
      ? cpuMillicoresToQuantity(appForm.cpu)
      : isNumericString(appForm.cpu)
      ? cpuMillicoresToQuantity(Number(appForm.cpu))
      : quantityFromJSONOrZero(appForm.cpu),
  memory:
    appForm.memory instanceof Quantity
      ? appForm.memory
      : typeof appForm.memory === 'number'
      ? memoryMiToQuantity(appForm.memory)
      : isNumericString(appForm.memory)
      ? memoryMiToQuantity(Number(appForm.memory))
      : quantityFromJSONOrZero(appForm.memory),
  storeList: appForm.storeList.map((store) => ({
    ...store,
    value:
      store.value instanceof Quantity
        ? store.value
        : typeof store.value === 'number'
        ? storageGiToQuantity(store.value)
        : storageAnnotationToQuantity(store.value)
  }))
});
