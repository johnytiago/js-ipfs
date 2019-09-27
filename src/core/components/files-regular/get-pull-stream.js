'use strict'

const debug = require('debug')
const exporter = require('ipfs-unixfs-exporter')
const pull = require('pull-stream')
const errCode = require('err-code')
const { normalizePath } = require('./utils')
const _ = require('lodash')

const log = debug('ipfs:stats')
log.trace = debug('ipfs:stats:trace')

module.exports = function (self) {
  return (ipfsPath, options) => {
    options = options || {}
    const now = Date.now()

    if (options.preload !== false) {
      let pathComponents

      try {
        pathComponents = normalizePath(ipfsPath).split('/')
      } catch (err) {
        return pull.error(errCode(err, 'ERR_INVALID_PATH'))
      }

      self._preload(pathComponents[0])
    }

    return pull(
      exporter(ipfsPath, self._ipld, options),
      pull.map(file => {
        const duration = Date.now() - now
        const id = _.get(self, 'libp2p.peerInfo.id._idB58String')
        log.trace('get_file %j', { id , cid: file.cid.toString(), duration })
        file.duration = duration

        file.hash = file.cid.toString()
        delete file.cid
        return file
      })
    )
  }
}
