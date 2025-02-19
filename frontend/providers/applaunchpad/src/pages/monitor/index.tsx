import axios from "axios";
import { useEffect, useState } from "react";

const App = () => {
  const [pageUrl, setPageUrl] = useState<string>('')

  useEffect(() => {
    initPageUrl()
  }, [])

  const initPageUrl = async() => {
    const resp = await axios.get('/config.json')
    if (resp && resp.data) {
      const { monitorPageUrl } = resp.data
      setPageUrl(monitorPageUrl)
    }
  }

  return <>
    <iframe src={pageUrl} width={'100%'} height={'100%'}></iframe>
  </>;
};

export default App;