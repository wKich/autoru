// @flow

const http = require('http')
const express = require('express')
const socket = require('socket.io')

const app = express()
const server = http.Server(app)
const io = socket(server)

let counter = 0

app.set('port', process.env.PORT || 5000)

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
io.on('connection', client => {
  const interval = setInterval(() => client.emit('counter', { counter }), 1000)
  console.log('a user connected')
  client.on('disconnect', () => {
    clearInterval(interval)
    console.log('user disconnected')
  })
})
server.listen(app.get('port'), () => {
  console.log(`Server listening on *:${app.get('port')}`)
  setInterval(() => counter += 1, 1000)
})
