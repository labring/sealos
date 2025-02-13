export const getTimeDiff = (createdAt: number, requestAt: number) => {
  const diff = Number(((createdAt - requestAt) / 1000).toFixed(4)).toString()
  return `${diff}s`
}
