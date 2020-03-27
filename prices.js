// @flow

const fs = require('fs')
const { MongoClient } = require('mongodb')

function getMedian(numbers) {
  const middle = numbers.length / 2
  const even = Number(middle != (middle | 0))

  return numbers.slice(middle - even, middle + 1 + even).reduce((res, num, _, arr) => res + num / arr.length, 0)
}

function groupBy(array, prop) {
  return array.reduce((byProp, item) => ({...byProp, [item[prop]]: [...byProp[item[prop]] || [], item] }), {})
}

const {
  DB_USER,
  DB_PASS,
  DB_HOST,
  DB_PORT,
  DB_NAME,
} = process.env

MongoClient.connect(
  `mongodb://${
    DB_USER || 'root'
  }:${
    DB_PASS || 'root'
  }@${
    DB_HOST || 'ds237445.mlab.com'
  }:${
    DB_PORT || '37445'
  }/${
    DB_NAME || 'autoru'
  }`
)
.then(db => db.collection('cars').find({}, { id: 1, link: 1, categoryDesc: 1, 'saleData.price': 1 }).toArray())
.then(cars => cars.map(({ id, link, categoryDesc: { mark, model, generation, 'body-type': bodyType, modification }, saleData: { price }}) => ({id, link, mark, model, generation, bodyType, modification, price })))
.then(cars => {
  const carsByMark = groupBy(cars, 'mark')
  const carsByModel = Object.keys(carsByMark)
    .reduce((byModel, mark) => ({
      ...byModel,
      [mark]: groupBy(carsByMark[mark], 'model')
    }), {})
  const carsByGeneration = Object.keys(carsByModel)
    .reduce((byModel, mark) => ({
      ...byModel,
      [mark]: Object.keys(carsByModel[mark])
        .reduce((byGen, model) => ({
          ...byGen,
          [model]: groupBy(carsByModel[mark][model], 'generation')
        }), {})
      }), {})

  const medianByMark = Object.keys(carsByMark)
    .reduce((median, mark) => ({
      ...median,
      [mark]: getMedian(carsByMark[mark].map(({ price }) => price ))
    }), {})
  const medianByModel = Object.keys(carsByModel)
    .reduce((median, mark) => ({
      ...median,
      [mark]: Object.keys(carsByModel[mark])
        .reduce((byModel, model) => ({
          ...byModel,
          [model]: getMedian(carsByModel[mark][model].map(({ price }) => price ))
        }), {})
      }), {})
  const medianByGeneration = Object.keys(carsByGeneration)
    .reduce((median, mark) => ({
      ...median,
      [mark]: Object.keys(carsByGeneration[mark])
        .reduce((byModel, model) => ({
          ...byModel,
          [model]: Object.keys(carsByGeneration[mark][model])
            .reduce((byGen, gen) => ({
              ...byGen,
              [gen]: getMedian(carsByGeneration[mark][model][gen].map(({ price }) => price ))
            }), {})
          }), {})
        }), {})

  fs.writeFileSync('byMark.json', JSON.stringify(medianByMark, null, 2))
  fs.writeFileSync('byModel.json', JSON.stringify(medianByModel, null, 2))
  fs.writeFileSync('byGeneration.json', JSON.stringify(medianByGeneration, null, 2))
}).catch(err => console.log(err))
