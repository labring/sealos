export function wait(ms:number) {
  return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
          console.log("Done waiting");
          resolve()
      }, ms)
  })
}