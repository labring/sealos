import { Authority } from '@/consts';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'next-i18next';

/**
 * copy text data
 */
export const useCopyData = () => {
  const { toast } = useToast();
  const { t } = useTranslation('tools');

  return {
    copyData: (data: string) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = data;
        document.body.appendChild(textarea);
        textarea.select();
        // ts-ignore
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast({
          title: t('copySuccess'),
          status: 'success',
          duration: 1000
        });
      } catch (error) {
        console.error(error);
        toast({
          title: t('copyFailed'),
          status: 'error'
        });
      }
    }
  };
};

/**
 * 下载文件到本地
 */
export function downLoadBold(content: BlobPart, type: string, fileName: string) {
  // 创建一个 Blob 对象
  const blob = new Blob([content], { type });

  // 创建一个 URL 对象
  const url = URL.createObjectURL(blob);

  // 创建一个 a 标签
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  // 模拟点击 a 标签下载文件
  link.click();
  link.remove();
}

export const inAuthority = (val: unknown): boolean =>
  Object.values(Authority).includes(val as Authority);
// 1¥=1000000
export const formatMoney = (money: number) => money / 1000000;
export const deFormatMoney = (money: number) => money * 1000000;
export const displayMoney = (money: number) => money.toFixed(2);
export function formatBytes(
  bytes: number,
  decimals = 2
): {
  value: number;
  size: string;
  toString: () => string;
} {
  if (bytes === 0)
    return {
      value: 0,
      size: 'B',
      toString() {
        return '0B';
      }
    };

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return {
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
    size: sizes[i],
    toString() {
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + '' + sizes[i];
    }
  };
}
