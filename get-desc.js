// @flow

/*
Нужная инфа
#sale-data-attributes -> data-bem -> JSON.parse (Инфа о машинке)
.breadcrumbs-item -> data-bem -> JSON.parse (Классификация API)
.card__info -> dt - dd (Краткая инфа)
.seller-details__text -> innerText (Описание продавца)
.card__package-title + .card__package-item (Список фишек)
.gallery__thumb-item -> data-href (Список фотографий)
.card__sold-time-header -> innerText (Время со дня размещения до продажи)
.card__stat-item -> 1 -> innerText (Дата размещения)
.breadcrumbs-item -> innerText (Классификация человеко-читаемая. mark -> model -> super_gen -> configuration_id -> tech_param_id)
*/

/*
Возможно есть что-то
#seller-data-attributes -> data-bem -> JSON.parse
*/

// https://auto.ru/cars/used/sale/${марка}/${модель}/${id}-${какой-то хеш}/

// Страница на каталог таких машин
// https://auto.ru/cars/vaz/1111/6268019/6268026/20469452/used/
// ${category}/${mark}/${model}/${super_gen}/${configuration_id}/${tech_param_id}/${section}

// Страница с техническим описанием
// https://auto.ru/catalog/cars/vaz/1111/6268019/6268026/specifications/
// ${category}/${mark}/${model}/${super_gen}/${configuration_id}/specifications

const bluebird = require('bluebird')
const cheerio = require('cheerio')
const request = require('request-promise')
const { StatusCodeError } = require('request-promise/errors')

const withRetry = require('./retry')

const getCarInfo = withRetry(link => {
  console.log(`Getting car info by link '${link}'`)
  return request.get({ uri: link, headers: { Cookie: 'los=yes' } })
  .catch(StatusCodeError, error => {
    if (error.statusCode == 404) {
      console.log(`Car not found by link '${link}'`)

      return null
    }
    throw error
  })
})

function zip(a, b) {
  return Array.from({ length: Math.max(a.length, b.length) }).map((_, index) => [a[index], b[index]])
}

function parseSaleDate($) {
  return JSON.parse($('#sale-data-attributes').attr('data-bem'))['sale-data-attributes']
}

function parseCarCategory($) {
  return JSON.parse($('.breadcrumbs-item').attr('data-bem'))['breadcrumbs-item'].callParams.data
}

function parseImages($) {
  return $('.gallery__thumb-item')
    .toArray()
    .map(itemEl => $(itemEl).attr('data-href'))
}

function parseCardInfo($) {
  return zip($('.card__info dt').toArray(), $('.card__info dd').toArray()).reduce(
    (info, [keyEl, valueEl]) => ({ ...info, [$(keyEl).text()]: $(valueEl).text() }),
    {},
  )
}

function parseCardPackage($) {
  return $('.card__package-title')
    .toArray()
    .map(titleEl => $(titleEl))
    .reduce(
      (package, $titleEl) => ({
        ...package,
        [$titleEl.text()]: $titleEl
          .next()
          .children('.card__package-item')
          .toArray()
          .map(itemEl => $(itemEl).text()),
      }),
      {},
    )
}

function parseCategoryDesc($) {
  return $('.breadcrumbs-item')
    .toArray()
    .map(itemEl => $(itemEl))
    .reduce(
      (desc, $itemEl) => ({
        ...desc,
        [JSON.parse($itemEl.attr('data-bem'))
          ['breadcrumbs-item'].callParams.block.replace('breadcrumbs-', '')
          .slice(0, -1)]: $itemEl.find('a').text(),
      }),
      {},
    )
}

module.exports = function getCarDescription(link /* :string */) {
  return getCarInfo(link)
  .then(content => {
    if (content == null) return null

    console.log(`Parsing car info from link '${link}'`)
    const $ = cheerio.load(content)

    return {
      link,
      soldFor: $('.card__sold-time-header').text(),
      onSaleFrom: $('.card__stat-item').eq(1).text(),
      sellerDetails: $('.seller-details__text').text(),
      saleData: parseSaleDate($),
      carCategory: parseCarCategory($),
      images: parseImages($),
      cardInfo: parseCardInfo($),
      cardPackage: parseCardPackage($),
      categoryDesc: parseCategoryDesc($),
    }
  })
  .catch(error => console.log(`Failed to get car info: ${error.message}`))
}
