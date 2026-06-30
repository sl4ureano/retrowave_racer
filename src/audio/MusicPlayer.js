export function sendYouTubeCommand(func, args=[]){
  const frame = document.getElementById('ytMusic');
  const win = frame?.contentWindow;
  if (!win) return;
  win.postMessage(JSON.stringify({
    event:'command',
    func,
    args
  }), '*');
}
