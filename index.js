// @flow

const http = require('http')
const bluebird = require('bluebird')
const express = require('express')
const socket = require('socket.io')
const request = require('request-promise')
const { MongoClient } = require('mongodb')

const getLinks = require('./get-links')
const getDesc = require('./get-desc')

const app = express()
const server = http.Server(app)
const io = socket(server)

const startDateTime = Date.now()

app.set('port', process.env.PORT || 5000)

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/_status', (req, res) => res.send(`Uptime: ${(Date.now() - startDateTime) / 1000} seconds`))

io.on('connection', client => {
  console.log('User connected')
  // TODO send statistics
  client.on('disconnect', () => console.log('User disconnected'))
})

server.listen(app.get('port'), () => {
  console.log(`Server listening on *:${app.get('port')}`)
  setInterval(() => request.get('https://autoru.herokuapp.com/_status').then(res => console.log(res)), 10 * 60 * 1000)
})

const {
  DB_USER,
  DB_PASS,
  DB_HOST,
  DB_PORT,
  DB_NAME,
} = process.env

MongoClient.connect(
  `mongodb://${
    DB_USER || 'user'
  }:${
    DB_PASS || 'password'
  }@${
    DB_HOST || 'localhost'
  }:${
    DB_PORT || '27017'
  }/${
    DB_NAME || 'dbName'
  }`).then(db => {
  db.close()
})

bluebird.all([
  //mongodb.get(oldLinks)
  bluebird.reduce(Array.from({ length: 1000 }), (links, index) => getLinks(index).then(part => part.forEach(links.set.bind(links))), new Map()),
])
.then(([links, nextLinks]) => {
  const addedLinks = new Map(Array.from(nextLinks.entries()).filter(id => !links.has(id)))
  const removedLinks = new Map(Array.from(links.entries()).filter(id => !nextLinks.has(id)))

  getDesc(addedLinks)//.filter(x => x).then(result => mongodb.save(result))
  getDesc(removedLinks)//.then(result => mongodb.update(result))

  // car removed
  // car sold
})

// Делать запросы в 6 утра на список машинок
// Получать новые и удаленные/проданные машинки
//
