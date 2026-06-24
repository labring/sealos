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

const hydrateLegacyCpu = (value: unknown): Quantity =>
  value instanceof Quantity
    ? value
    : typeof value === 'number'
    ? cpuMillicoresToQuantity(value)
    : isNumericString(value)
    ? cpuMillicoresToQuantity(Number(value))
    : quantityFromJSONOrZero(value);

const hydrateLegacyMemory = (value: unknown): Quantity =>
  value instanceof Quantity
    ? value
    : typeof value === 'number'
    ? memoryMiToQuantity(value)
    : isNumericString(value)
    ? memoryMiToQuantity(Number(value))
    : quantityFromJSONOrZero(value);

const hydrateLegacyStorage = (value: unknown): Quantity =>
  value instanceof Quantity
    ? value
    : typeof value === 'number'
    ? storageGiToQuantity(value)
    : storageAnnotationToQuantity(typeof value === 'string' ? value : undefined);

export const hydrateLegacyAppFormData = <T extends Partial<AppEditType>>(appForm: T): T =>
  ({
    ...appForm,
    ...(appForm.cpu !== undefined ? { cpu: hydrateLegacyCpu(appForm.cpu) } : {}),
    ...(appForm.memory !== undefined ? { memory: hydrateLegacyMemory(appForm.memory) } : {}),
    ...(appForm.storeList
      ? {
          storeList: appForm.storeList.map((store) => ({
            ...store,
            value: hydrateLegacyStorage(store.value)
          }))
        }
      : {})
  } as T);

export const hydrateLegacyAppForm = (appForm: AppEditType): AppEditType =>
  hydrateLegacyAppFormData({
    ...appForm
  });
