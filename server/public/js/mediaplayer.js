const socket = io()

document.addEventListener('click', function (e) {
  e.preventDefault()

  let element = e.target

	if (element.matches('.play-item')){
    socket.emit('play media', {media: element.getAttribute('data-item')})
  }
}, false)
