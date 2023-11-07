document.addEventListener("DOMContentLoaded", function () {
  console.log('addEventListener')
  const parentElement = document.body
  parentElement.addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      const href = event.target.getAttribute("href")
      const currentHostname = window.location.hostname
      const bdId = sessionStorage.getItem("bd_vid")
      console.log(bdId, 'bd_vid')
      if (href.includes("sealos.io") || href.includes("sealos.top") || href.includes("sealos.run")) {
        event.preventDefault()
        console.log("特殊处理链接： " + href)

        const targetHostname = (currentHostname === "sealos.io") ? "sealos.io" : "sealos.top"
        const modifiedHref = href.replace("sealos.io", targetHostname)
        console.log(modifiedHref, '修改后的链接')

        event.target.href = modifiedHref
        window.open(modifiedHref)
      }
    }
  })
})
