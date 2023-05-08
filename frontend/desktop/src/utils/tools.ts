import dayjs from 'dayjs'

export const formatTime = (
  time: string | number | Date,
  format = 'YYYY-MM-DD HH:mm:ss'
) => {
  return dayjs(time).format(format)
}

// 1¥=10000
export const formatMoney = (money: number) => {
  return (money / 10000).toFixed(2)
}
