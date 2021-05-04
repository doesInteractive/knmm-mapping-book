require('dotenv').config()

// require.
const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const bodyParser = require('body-parser')
const fs = require('fs')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const indexRouter = require('./routes/index')

// arduino variable
const net = require("net")
const ardinoIpAdress = '192.168.0.70'
const arduinoServer = net.createServer(onClientConnected)

// kill logitech capture
const wincmd = require('node-windows')
const find = require('find-process')
find('name', 'LogiCapture.exe', true)
  .then(function (process) {
    if (process[0] != undefined) {
      console.log(process[0].pid)
      wincmd.kill(process[0].pid, 'SIGKILL', function(){
        console.log('LogiCapture.exe', 'process killed')
      })
    }
  })

// app setting
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.use(logger('dev'))
app.use(bodyParser.json({limit: '500mb'}))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)

let buttonClicked = false

// socketIO middleware
app.use(function(req, res, next){
  res.io = io
  next()
})

//catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

//error handler
app.use(function(err, req, res, next) {
  //set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  //render the error page
  res.status(err.status || 500)
  res.render('error')
})

// send pagedata to unity
io.on('connection', function(socket){
  console.log('a user connected')

  socket.on('play media', function(data){
    // block button click when page change
    buttonClicked = true
    setTimeout(function(){ buttonClicked = false }, 3000)

    console.log('data received: ',data)
    io.emit('play media', data)
  })

  socket.on('play all media', function(data){
    let timePerPage = (data.dataPointsPerClass * data.captureSpeed) / data.classes.length

    for (let i = 0; i < data.classes.length; i++) {
      setTimeout(() => {
        let pageIndex = i * 2
        console.log('playing media: '+ pageIndex)
        io.emit('play all media', {media: ''+ pageIndex})
      }, timePerPage * i)
    }
  })

  socket.on('disconnect', function(){
    console.log('user disconnected')
  })
})

// arduino server listen
arduinoServer.listen(8888, '0.0.0.0', function() {
  console.log('server listening on %j', arduinoServer.address())
})

// arduino connect
function onClientConnected(socket) {

  // remote adress and port of arduino
  let remoteAddress = socket.remoteAddress + ':' + socket.remotePort

  console.log('new client connected: %s', remoteAddress)

  // get data from arduino
  socket.on('data', function(data) {
    if(socket.remoteAddress == ardinoIpAdress){
      try {
        let json_data = JSON.parse(data.toString())
        btnEventHandler(json_data)
      } catch (e) {
        console.log(e)
      }
    }
  })
  socket.on('close',  function () {
    console.log('connection from %s closed', remoteAddress)
  })
  socket.on('error', function (err) {
    console.log('Connection %s error: %s', remoteAddress, err.message)
  })
}

function btnEventHandler(data) {

  if(data.status == 0 || buttonClicked)
    return

  if(data.id == '1' || data.id == '0'){
    buttonClicked = true
    io.emit('play media',  {'media':'popup'+data.id})
  }


  else if(data.id == '2'){
    buttonClicked = true
    io.emit('play media',  {'media':'changelang'})
  }

  setTimeout(function(){ buttonClicked = false }, 3000)
}

module.exports = {app:app, server:server}
