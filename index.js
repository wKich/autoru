// @flow

const http = require('http')
const express = require('express')
const socket = require('socket.io')

const app = express()
const server = http.Server(app)
const io = socket(server)

const PORT = 3000

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
io.on('connection', client => {
  let counter = 0
  console.log('a user connected')
  client.on('disconnect', () => console.log('user disconnected'))
  setInterval(() => client.emit('counter', { counter: counter++ }), 1000)
})
server.listen(PORT, () => console.log(`Server listening on *:${PORT}`))
