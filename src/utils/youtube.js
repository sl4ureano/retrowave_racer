export function youtubeWatchToId(urlOrId){
  const value = String(urlOrId || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  const match =
    value.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    value.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    value.match(/embed\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : value;
}

export function youtubeEmbedUrl(id){
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&controls=1&loop=1&playlist=${id}&playsinline=1&rel=0`;
}
