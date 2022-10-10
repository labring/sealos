import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'


const MarkDown = ({ text }: { text: string }) => {
	return <ReactMarkdown
		rehypePlugins={[rehypeHighlight]}
	>{text ?? ''}</ReactMarkdown>
}

export default MarkDown;