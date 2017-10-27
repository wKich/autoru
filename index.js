// @flow

const http = require('http')
const express = require('express')
const socket = require('socket.io')
const request = require('request-promise')

const app = express()
const server = http.Server(app)
const io = socket(server)

const startDateTime = Date.now()

app.set('port', process.env.PORT || 5000)

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/_status', (req, res) => res.send(`Uptime: ${(Date.now() - startDateTime) / 1000} seconds`))

io.on('connection', client => {
  console.log('User connected')
  client.on('disconnect', () => console.log('User disconnected'))
})

server.listen(app.get('port'), () => {
  console.log(`Server listening on *:${app.get('port')}`)
  setInterval(() => request.get('https://autoru.herokuapp.com/_status').then(res => console.log(res)), 10 * 60 * 1000)
})
