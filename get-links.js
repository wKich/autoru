// @flow

// https://auto.ru/cars/used/sale/${марка}/${модель}/${id}-${какой-то хеш}/

const fs = require('fs')
const bluebird = require('bluebird')
const cheerio = require('cheerio')
const request = require('request-promise')

const query = {
  category: 'cars',
  section: 'used',
  gear_type: 'FORWARD_CONTROL',
  steering_wheel: 'LEFT',
  geo_id: '54',
  geo_radius: '100',
  image: 'true',
  beaten: '1',
  customs_state: '1',
  output_type: 'list'
}

const from = 0

const prices = Array.from({ length: 1000 }).map((_, index) => ({
  price_from: index * 5000,
  price_to: (index + 1) * 5000 - 1
}))
.filter(price => price.price_from >= from)

bluebird.each(prices, price => {
  let current = 0
  function byPage(page) {
    current = page
    console.log(`${price.price_from}-${price.price_to}_${current}`)

    return {
      url: 'https://auto.ru/-/ajax/listing',
      qs: Object.assign({ page_num_offers: page }, price, query),
      headers: {
        Cookie: 'los=yes'
      }
    }
  }

  function parse(res) {
    const $ = cheerio.load(res)

    fs.writeFileSync(
      `links/${price.price_from}-${price.price_to}_${current}`,
      $('.listing-item').toArray().map(element => $(element).children().first().find('.listing-item__link').attr('href')).join('\n')
    )

    return $
  }

  return request.get(byPage(1)).then(parse).then($ => {
    if ($('.pager_has-more').length) {
      const pages = JSON.parse($('.pager_has-more').attr('data-bem')).pager.max

      return bluebird.each(Array.from({ length: pages - 1 }).map((_, index) => index + 2), page => request.get(byPage(page)).then(parse))
    }
  })
})
