
const getYouTubeId = (url) => {
  if (!url) return null

  const regExp =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/

  const match = url.match(regExp)
  return match ? match[1] : null
}


const TrailerVideo = ({ videoUrl }) => {
  const videoId = getYouTubeId(videoUrl)

  if (!videoId) {
    return (
      <p className="text-red-500 text-center">
        Invalid YouTube URL
      </p>
    )
  }

  return (
    <iframe
      key={videoId}
      width="960"
      height="540"
      className="mx-auto rounded-lg relative z-10"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`}
      allow="autoplay; encrypted-media"
      allowFullScreen
    />
  )
}

export default TrailerVideo
