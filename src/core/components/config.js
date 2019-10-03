'use strict'

const async = require('async')
const promisify = require('promisify-es6')

module.exports = function config (self) {
  return {
    get: promisify((key, callback) => {
      if (typeof key === 'function') {
        callback = key
        key = undefined
      }

      return self._repo.config.get(key, callback)
    }),
    set: promisify((key, value, callback) => {
      async.waterfall([
        cb => self._repo.config.set(key, value, cb),
        cb => {
          // Force startrail to get new confgs
          if(key.startsWith('Startrail')) {
            if (self._startrail){
              return self._startrail.updateConfig(cb)
            }
          }
          cb()
        }
      ], callback)
    }),
    replace: promisify(async (config, callback) => {
      async.waterfall([
        cb => self._repo.config.set(config, cb),
        cb => {
          // Force startrail to get new confgs
          if (self._startrail){
            return self._startrail.updateConfig(cb)
          }
          cb()
        }
      ], callback)
    })
  }
}
