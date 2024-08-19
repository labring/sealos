import { useMessage } from '@sealos/ui'

export const cpuFormatToM = (cpu = '0') => {
  if (!cpu || cpu === '0') {
    return 0
  }
  let value = parseFloat(cpu)

  if (/n/gi.test(cpu)) {
    value = value / 1000 / 1000
  } else if (/u/gi.test(cpu)) {
    value = value / 1000
  } else if (/m/gi.test(cpu)) {
    value = value
  } else {
    value = value * 1000
  }
  if (value < 0.1) return 0
  return Number(value.toFixed(4))
}

export const memoryFormatToMi = (memory = '0') => {
  if (!memory || memory === '0') {
    return 0
  }

  let value = parseFloat(memory)

  if (/Ki/gi.test(memory)) {
    value = value / 1024
  } else if (/Mi/gi.test(memory)) {
    value = value
  } else if (/Gi/gi.test(memory)) {
    value = value * 1024
  } else if (/Ti/gi.test(memory)) {
    value = value * 1024 * 1024
  } else {
    console.log('Invalid memory value')
    value = 0
  }

  return Number(value.toFixed(2))
}

export const storageFormatToNum = (storage = '0') => {
  return +`${storage.replace(/gi/i, '')}`
}

export const printMemory = (val: number) => {
  return val >= 1024 ? `${Math.round(val / 1024)} Gi` : `${val} Mi`
}

export function downLoadBlob(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type })

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName

  link.click()
}

export const obj2Query = (obj: Record<string, string | number>) => {
  let str = ''
  Object.entries(obj).forEach(([key, val]) => {
    if (val) {
      str += `${key}=${val}&`
    }
  })

  return str.slice(0, str.length - 1)
}

export const useCopyData = () => {
  const { message: toast } = useMessage()

  return {
    copyData: (data: string, title: string = 'copy_success') => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = data
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        toast({
          title: title,
          status: 'success',
          duration: 1000
        })
      } catch (error) {
        console.error(error)
        toast({
          title: '复制失败',
          status: 'error'
        })
      }
    }
  }
}

export const str2Num = (str?: string | number) => {
  return !!str ? +str : 0
}

export const getErrText = (err: any, def = '') => {
  const msg: string = typeof err === 'string' ? err : err?.message || def || ''
  msg && console.log('error =>', msg)
  return msg
}
