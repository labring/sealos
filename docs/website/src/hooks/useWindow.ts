import { useEffect, useState } from "react";
import useIsBrowser from '@docusaurus/useIsBrowser';

export default function() {
    const isBrowser = useIsBrowser();
    const [screenWidth, setScreenWidth] = useState(isBrowser ? document.body.clientWidth : 1440)

    useEffect(() => {
        if(!isBrowser) return
        setScreenWidth(document.body.clientWidth)
        const updateScreenWidth = () => {
            requestAnimationFrame(() => setScreenWidth(document?.body.clientWidth))
        }
        window.addEventListener('resize', updateScreenWidth)

        return () => {
            window.removeEventListener('resize', updateScreenWidth)
        }
    },[isBrowser])

    return {
        screenWidth
    }
}