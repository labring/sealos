// 根据当前费用计算优惠金额
export const getFavorable =
  (steps: number[] = [], ratios: number[] = []) =>
  (amount: number) => {
    let ratio = 0;

    const step = [...steps].reverse().findIndex((step) => amount >= step);
    if (ratios.length > step && step > -1) ratio = [...ratios].reverse()[step];
    return Math.floor((amount * ratio) / 100);
  };
