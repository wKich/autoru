// @flow

/*
Нужная инфа
#sale-data-attributes -> data-bem -> JSON.parse (Инфа о машинке)
.breadcrumbs-item -> data-bem -> JSON.parse (Классификация)
.card__info -> dt - dd
.seller-details__text -> innerText
.card__package-title + .card__package-item
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

const links = []
  .concat(...fs.readdirSync('links').map(filename => fs.readFileSync(`links/${filename}`, 'utf-8').split('\n')))
  .filter(link => link)

const result = {}

bluebird.each(links, link =>
  request.get({ uri: link, headers: { Cookie: 'los=yes' } })
  .then(res => {
    console.log(link)
    const $ = cheerio.load(res)
    const [id] = link
      .split('/')
      .filter(s => s)
      .slice(-1)[0]
      .split('-')

    if (result[id]) throw new Error(`Already have this id: ${id}`)

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

    result[id] = {
      sellerDetails,
      ...saleData,
      ...carCategory,
      ...cardInfo,
      ...cardPackage
    }
  }),
).then(() => fs.writeFileSync('desc.json', JSON.stringify(result, null, 2)))
