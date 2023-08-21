import React, { useRef, useEffect } from 'react'
import prismjs from 'prismjs';
import "./index.scss"

function PrismCode({ code, language }:{code:string, language: string}) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref && ref.current) {
      prismjs.highlightElement(ref.current)
    }
  }, [code])

  return (
    <pre className="my-code-block">
      <code ref={ref} className={`prism-code language-${language}`}>
        {code}
      </code>
    </pre>
  )
}
export default PrismCode