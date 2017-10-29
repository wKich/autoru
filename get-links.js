// @flow

const bluebird = require('bluebird')
const cheerio = require('cheerio')
const request = require('request-promise')

const withRetry = require('./retry')

const priceStep = 5000
const listingUrl = 'https://auto.ru/-/ajax/listing'
const headers = { Cookie: 'los=yes' }
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

function priceQuery(stepCount) {
  return {
    price_from: stepCount * priceStep,
    price_to: (stepCount + 1) * priceStep - 1
  }
}

function pageQuery(page) {
  return { page_num_offers: page }
}

function getLinksFromPage(index) {
  return page => {
    console.log(`Getting cars for price '${index * priceStep}' and page '${page}'`)
    return request.get({
      url: listingUrl,
      qs: Object.assign({}, pageQuery(page), priceQuery(index), query),
      headers
    })
  }
}

function withPager(requestFunc, parseFunc) {
  return new bluebird((resolve, reject) => {
    let pageCount = 1

    let pagerFunc = (links = [], page = 1) => requestFunc(page)
      .then(parseFunc)
      .then(({ linksFromPage, maxPage = pageCount }) => {
        if (pageCount < maxPage) pageCount = maxPage
        if (page == pageCount) return resolve([...links, ...linksFromPage])

        pagerFunc([...links, ...linksFromPage], page + 1)
      })
      .catch(reject)

    pagerFunc()
  })
}

function parseContent(content /* :string */) {
  const $ = cheerio.load(content)
  let maxPage = 1

  if ($('.pager_has-more').length) {
    maxPage = JSON.parse($('.pager_has-more').attr('data-bem')).pager.max
  }

  const linksFromPage = $('.listing-item__link').toArray().map(element => $(element).attr('href'))

  return { linksFromPage, maxPage }
}

function getIdFromLink(link /* :string */) {
  return link.split('/').filter(s => s).slice(-1)[0].split('-')[0]
}

module.exports = function getCarLinks(index /* :number */) {
  return withPager(withRetry(getLinksFromPage(index)), parseContent)
  .then(links => {
    const linksById = links.reduce((acc, link) => ({ ...acc, [getIdFromLink(link)]: link }), Object.create(null))

    console.log(`Successful getted '${Object.keys(linksById).length}' cars for price '${index * priceStep}'`)

    return linksById
  })
}
