// 根据当前费用计算优惠金额
export const getFavorable = (amount: number) => {
    let ratio: number;
    switch (true) {
        case amount < 299:
            return 0;
        case amount < 599:
            ratio = 10;
            break;
        case amount < 1999:
            ratio = 15;
            break;
        case amount < 4999:
            ratio = 20;
            break;
        case amount < 19999:
            ratio = 25;
            break;
        default:
            ratio = 30;
    }
    return Math.floor(amount * ratio / 100);
}