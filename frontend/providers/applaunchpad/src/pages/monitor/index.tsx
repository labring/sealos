import axios from "axios";
import { useEffect, useState } from "react";

const App = () => {
  const [pageUrl, setPageUrl] = useState<string>('')

  useEffect(() => {
    initPageUrl()
  }, [])

  const initPageUrl = async() => {
    const url: string = process.env.MONITOR_PAGE_URL as string
    setPageUrl(url)
  }

  return <>
    <iframe src={pageUrl} width={'100%'} height={'100%'}></iframe>
  </>;
};

export default App;