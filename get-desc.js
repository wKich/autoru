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

// Страница на каталог таких машин
// https://auto.ru/cars/vaz/1111/6268019/6268026/20469452/used/
// ${category}/${mark}/${model}/${super_gen}/${configuration_id}/${tech_param_id}/${section}

// Страница с техническим описанием
// https://auto.ru/catalog/cars/vaz/1111/6268019/6268026/specifications/
// ${category}/${mark}/${model}/${super_gen}/${configuration_id}/specifications

const fs = require('fs')
const bluebird = require('bluebird')
const cheerio = require('cheerio')
const request = require('request-promise')

function zip(a, b) {
  return Array.from({ length: Math.max(a.length, b.length) }).map((_, index) => [a[index], b[index]])
}

function sort(a, b) {
  const lengthDiff = a.length - b.length
  if (lengthDiff != 0) return lengthDiff
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

const links = []
  .concat(...fs.readdirSync('links').sort(sort).map(filename => fs.readFileSync(`links/${filename}`, 'utf-8').split('\n')))
  .filter(link => link)

const result = {}

bluebird.each(links, link =>
  request.get({ uri: link, headers: { Cookie: 'los=yes' } }).then(res => {
    console.log(link)
    const $ = cheerio.load(res)
    const [id] = link
      .split('/')
      .filter(s => s)
      .slice(-1)[0]
      .split('-')

    if (result[id]) return console.log(`Already have this id: ${id}`)

    const { 'sale-data-attributes': saleData } = JSON.parse($('#sale-data-attributes').attr('data-bem'))
    const { 'breadcrumbs-item': { callParams: { data: carCategory } } } = JSON.parse(
      $('.breadcrumbs-item').attr('data-bem'),
    )
    const cardInfo = zip($('.card__info dt').toArray(), $('.card__info dd').toArray()).reduce(
      (info, [keyEl, valueEl]) => ({ ...info, [$(keyEl).text()]: $(valueEl).text() }),
      {},
    )
    const sellerDetails = $('.seller-details__text').text()
    const cardPackage = $('.card__package-title')
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
    const images = $('.gallery__thumb-item')
      .toArray()
      .map(itemEl => $(itemEl).attr('data-href'))
    const soldFor = $('.card__sold-time-header').text()
    const onSaleFrom = $('.card__stat-item')
      .eq(1)
      .text()
    const categoryDesc = $('.breadcrumbs-item')
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

    result[id] = true

    fs.writeFileSync(
      `desc/${id}.json`,
      JSON.stringify(
        {
          images,
          soldFor,
          onSaleFrom,
          sellerDetails,
          cardInfo,
          carCategory,
          categoryDesc,
          cardPackage,
          ...saleData,
        },
        null,
        2,
      ),
    )
  }).catch(error => console.log(`Failed to get car info: ${error.message}`)),
)
