// @flow

const fs = require('fs')
const path = require('path')

function sort(a, b) {
  const lengthDiff = a.length - b.length
  if (lengthDiff != 0) return lengthDiff
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

const newIds = []
  .concat(
    ...fs
      .readdirSync('links')
      .sort(sort)
      .map(filename => fs.readFileSync(`links/${filename}`, 'utf-8').split('\n')),
  )
  .filter(link => link)
  .map(
    link =>
      link
        .split('/')
        .filter(s => s)
        .slice(-1)[0]
        .split('-')[0],
  )

const oldIds = fs.readdirSync('desc').map(filename => path.parse(filename).name)

const a = new Map(newIds.map(a => [a, null]))
const b = new Map(oldIds.map(a => [a, null]))

const added = Array.from(a.keys()).filter(id => !b.has(id)).sort()
const removed = Array.from(b.keys()).filter(id => !a.has(id)).sort()

console.log({ added, removed })
