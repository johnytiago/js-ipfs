'use strict'

module.exports = function startrail (self) {
  return {
    process: ({ cid, peer }, cb) => {
      console.log('Startrail - process :', cid);
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

            return self._repo.has(cid, cb);
          },
          // not in store ? Fetch from the network
          (has, cb) => {
            if (block) return cb(null);

            self.bitswap.get(cid, (err, block) => {
              // try again ?
              if (err) return cb(err);

              // dht set ourselves as providers of the block
              self.bitswap.network.provide(cid, err => {
                // could not set provide, try again?
                if (err) return cb(err);

                // successful
                return cb(null);
              });
            });
          }
        ],
        (err, result) => {
          if (err && err !== 'E_NOT_POPULAR') cb(err);

          cb(null);
        }
      );
    }
  }
}
