// @flow

module.exports = () => {
  const http = require('http')
  const express = require('express')
  const socket = require('socket.io')

  const app = express()
  const server = http.Server(app)
  const io = socket(server)

  const PORT = 3000
  let counter = 0

  app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
  io.on('connection', client => {
    const interval = setInterval(() => client.emit('counter', { counter }), 1000)
    console.log('a user connected')
    client.on('disconnect', () => {
      clearInterval(interval)
      console.log('user disconnected')
    })
  })
  server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`)
    setInterval(() => counter += 1, 1000)
  })
}
