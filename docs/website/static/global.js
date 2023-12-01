document.addEventListener("DOMContentLoaded", function () {
  console.log('Handle a tag interception')
  const parentElement = document.body
  parentElement.addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      const href = event.target.getAttribute("href")
      const currentHostname = window.location.hostname
      const targetHostname = "sealos.io"

      if (href.includes("sealos.io") || href.includes("sealos.top") || href.includes("sealos.run")) {
        event.preventDefault()

        console.log("Before:" + href)
        const modifiedHref = href.replace(/(sealos\.io|sealos\.top|sealos\.run)/, targetHostname)
        console.log("After:", modifiedHref)

        event.target.href = modifiedHref
        window.open(modifiedHref)
      }
    }
  })
})
