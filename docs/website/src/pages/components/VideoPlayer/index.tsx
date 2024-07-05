import React, { useRef } from 'react'
import './index.scss'

const VideoPlayer = ({ url }: { url: string }) => {
  const videoRef = useRef(null)
  const [isShowVideo, setIsShowVideo] = React.useState(false)

  return (
    <div className="video-box">
      <img
        draggable="false"
        src={require('@site/static/illustrations/video.jpg').default}
      />
      <img
        draggable="false"
        onClick={() => setIsShowVideo((v) => !v)}
        className="player-button"
        src={require('@site/static/illustrations/player.png').default}
      />
      {isShowVideo && (
        <div className="video-wrap" onClick={() => setIsShowVideo((v) => !v)}>
          <video
            onClick={(e) => {
              e.stopPropagation()
            }}
            src={url}
            ref={videoRef}
            controls
            autoPlay></video>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
