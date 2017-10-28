// @flow

const bluebird = require('bluebird')

module.exports = function withRetry(requestFunc /* :function */, maxRetries /* :number */ = 5) {
  return (...args /* :any */) => new bluebird((resolve, reject) => {
    let retryCounter = 1

    const retryFunc = () => requestFunc(...args)
      .then(resolve)
      .catch(error => {
        console.log(`Failed request on '${retryCounter}' retry, with error '${error.message}'`)
        if (retryCounter >= maxRetries) reject(error)
        retryCounter += 1
        setTimeout(retryFunc, (2 ** retryCounter - 1) * 1000)
      })

    retryFunc()
  })
}
