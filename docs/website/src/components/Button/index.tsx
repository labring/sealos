import React from 'react'
import Link from "@docusaurus/Link";
import './index.scss'

interface Props {
  children: JSX.Element
  link: string
}

const MyButton = ({
    children,
    link
}:Props) => {
  return (
    <Link
        className="link-btn"
        to={link}
    >
        {children}
    </Link>
  )
}

export default MyButton