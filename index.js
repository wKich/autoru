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

function readList() {
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
    }`
  )
  .then(db => {
    const carsCollection = db.collection('cars')

    bluebird.all([
      carsCollection.find({ recent: true }).toArray().then(cars => cars.reduce((links, car) => ({ ...links, [car.id]: car.link }), Object.create(null))),
      bluebird.reduce(Array.from({ length: 50 }), (links, _, index) => getLinks(index).then(part => ({ ...links, ...part }), Object.create(null))),
    ])
    .then(([links, nextLinks]) => {
      const addedIds = Object.keys(nextLinks).filter(id => !(id in links))
      const removedIds = Object.keys(links).filter(id => !(id in nextLinks))

      return bluebird.map(removedIds, id => getDesc(links[id]).then(desc => [id, desc]))
        .then(removedCars =>
          bluebird.all(
            removedCars.map(
              ([id, desc]) => carsCollection.update({ id }, { $set: desc ? { ...desc, recent: false, sold: true } : { ...desc, recent: false, removed: true } })
            )
          )
        )
        .then(() =>
          bluebird.filter(addedIds.map(id => getDesc(nextLinks[id]).then(desc => [id, desc])), ([, desc]) => desc)
            .then(addedCars => carsCollection.insertMany(addedCars.map(([id, desc]) => ({ id, ...desc }))))
            .then(() => carsCollection.updateMany({ $or: nextLinks.map(([id]) => ({ id })) }, { $set: { recent: true } }))
        )
    })
    .then(() => {
      db.close()
      setTimeout(readList, 3600)
    })
  })
}

readList()


// Делать запросы в 6 утра на список машинок
// Получать новые и удаленные/проданные машинки
//
