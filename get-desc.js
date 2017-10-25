// @flow

/*
Нужная инфа
#sale-data-attributes -> data-bem -> JSON.parse (Инфа о машинке)
.breadcrumbs-item .link_js_inited -> href (Ссылка на техническую инфу)
.card__info -> dt - dd
.seller-details__text -> innerText

.card__package-title + .card__package-item
*/

/*
Возможно есть что-то
#seller-data-attributes -> data-bem -> JSON.parse
*/

const fs = require('fs')
const bluebird = require('bluebird')
const cheerio = require('cheerio')
const request = require('request-promise')

bluebird.each(
  fs.readdirSync('links'),
  filename => bluebird.each(
    fs.readFileSync(`links/${filename}`, 'utf-8').split('\n'),
    link => link && request.get(link)
      .then(res => {
        const $ = cheerio.load(res)
        const [id] = link.split('/').slice(-1)[0].split('-')
      })
  )
)
