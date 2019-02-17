'use strict'

const waterfall = require('async/waterfall')

module.exports = function startrail (self) {
  return {
    process: ({ cid, peer }, cb) => {
      console.log('Startrail - process :', peer.id._idB58String);
      waterfall(
        [
          // update popularity
          // keep track of peers that asked for it
          cb => {
            return cb(null, true); // mock calculation
          },
          // popular ? Check blockstore for cid
          (popular, cb) => {
            if (!popular) return cb('E_NOT_POPULAR'); // break waterfall, not popular

            return self._repo.blocks.has(cid, cb);
          },
          // not in store ? Fetch from the network
          (has, cb) => {
            if (has) return cb();

            self._bitswap.get(cid, (err, block) => {
              // try again ?
              if (err) return cb(err);
              console.log("STARTRAIL DEBUG - Got from bitswap")

              // dht set ourselves as providers of the block
              self._bitswap._libp2p.contentRouting.provide(cid, err => {
                // could not set provide, try again?
                if (err) return cb(err);
                console.log("STARTRAIL DEBUG - Provide ran throught")

                // successful
                return cb();
              });
            });
          }
        ],
        (err, result) => {
          if (err && err !== 'E_NOT_POPULAR') {
            console.log('DEBUG startrail', err)
            return cb(err);
          }

          return cb();
        }
      );
    }
  }
}
