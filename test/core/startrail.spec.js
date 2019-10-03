/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const parallel = require('async/parallel')

const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({ type: 'proc' })

const config = {
  Bootstrap: [],
  Discovery: {
    MDNS: {
      Enabled: false
    },
    webRTCStar: {
      Enabled: false
    }
  },
  Startrail: {
    popularityManager: {
      cacheThreshold: 2
    }
  }
};

function createNode (startrail, callback) {
  if (typeof startrail === "function"){
    callback = startrail
    startrail = false
  }

  f.spawn({
    exec: require('../../src'),
    config,
    initOptions: { bits: 512 },
    EXPERIMENTAL: {
      startrail
    }
  }, callback)
}

describe('Startrail', async () => {
  describe('single node', async () => {
    let nodes
    let nodeA
    let nodeB

    before(function(done){
      this.timeout(5*1000)
      parallel([
        (cb) => createNode(true, cb),
        (cb) => createNode(true, cb),
        (cb) => createNode(true, cb)
      ], (err, _nodes) => {
        expect(err).to.not.exist()
        nodes = _nodes
        nodeA = _nodes[0].api
        nodeB = _nodes[1].api
        done()
      })
    })


    after(done => parallel( nodes.map(node => cb => node.stop(cb)), done))

    it('should not update if configs dont change', (done) => {
      const oldConfig = {
        popularityManager: {
          sampleDuration: 10 * 1000,
          windowSize: 3,
          cacheThreshold: 2
        }
      }
      nodeA.config.set("Startrail", {}, () => {
        expect(nodeA._startrail._options).to.deep.equal(oldConfig)
        done()
      })
    })


    it('should update if only a prop changes', (done) => {
      const newConfig = {
        popularityManager: {
          sampleDuration: 10 * 1000,
          windowSize: 5,
          cacheThreshold: 2
        }
      }

      nodeA.config.set("Startrail.popularityManager.windowSize", 5, () => {
        expect(nodeA._startrail._options).to.deep.equal(newConfig)
        done()
      })
    })

    it('should update configs', (done) => {
      const newConfig = {
        popularityManager: {
          sampleDuration: 20 * 1000,
          windowSize: 4,
          cacheThreshold: 3
        }
      }
      nodeB.config.set("Startrail", newConfig, () => {
        expect(nodeB._startrail._options).to.deep.equal(newConfig)
        done()
      })
    })
  })

  describe('with Startrail ON', async () => {
    let nodeA
    let nodeB
    let nodeC
    let nodeD
    let nodeE
    let addrB
    let addrC
    let addrD
    let addrE

    let nodes
    before(function (done) {
      this.timeout(40 * 1000)

      parallel([
        (cb) => createNode(cb),
        (cb) => createNode(true, cb),
        (cb) => createNode(cb),
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, _nodes) => {
        expect(err).to.not.exist()
        nodes = _nodes
        nodeA = _nodes[0].api
        nodeB = _nodes[1].api
        nodeC = _nodes[2].api
        nodeD = _nodes[3].api
        nodeE = _nodes[4].api
        parallel([
          (cb) => nodeB.id(cb),
          (cb) => nodeC.id(cb),
          (cb) => nodeD.id(cb),
          (cb) => nodeE.id(cb)
        ], (err, ids) => {
          expect(err).to.not.exist()
          addrB = ids[0].addresses[0]
          addrC = ids[1].addresses[0]
          addrD = ids[2].addresses[0]
          addrE = ids[3].addresses[0]
          parallel([
            (cb) => nodeA.swarm.connect(addrB, cb),
            (cb) => nodeB.swarm.connect(addrC, cb),
            (cb) => nodeB.swarm.connect(addrD, cb),
            (cb) => nodeB.swarm.connect(addrE, cb)
          ], done)
        })
      })
    })

    after((done) => parallel(nodes.map((node) => (cb) => node.stop(err => {
      err && err.message === "Already stopped" ? cb() : cb(err)
    })), done))

    it('add a file in A, fetch in C, fetch through B in D', async function () {
      this.timeout(30 * 1000)
      const file = {
        path: 'testfile1.txt',
        content: Buffer.from('hello cache')
      }

      const filesAdded = await nodeA.add(file)
      await nodeC.cat(filesAdded[0].hash)
      await nodeE.cat(filesAdded[0].hash)
      await nodeA.stop()
      await nodeC.stop()
      await nodeE.stop()
      const fetched = await nodeD.cat(filesAdded[0].hash)
      expect(fetched.toString()).to.eql('hello cache')
    })
  })

  describe.skip('with startrail OFF', () => {
    let nodeA
    let nodeB
    let nodeC
    let nodeD
    let nodeE
    let addrB
    let addrC
    let addrD
    let addrE

    let nodes
    before(function (done) {
      this.timeout(40 * 1000)

      parallel([
        (cb) => createNode(cb),
        (cb) => createNode(cb),
        (cb) => createNode(cb),
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, _nodes) => {
        expect(err).to.not.exist()
        nodes = _nodes
        nodeA = _nodes[0].api
        nodeB = _nodes[1].api
        nodeC = _nodes[2].api
        nodeD = _nodes[3].api
        nodeE = _nodes[4].api
        parallel([
          (cb) => nodeB.id(cb),
          (cb) => nodeC.id(cb),
          (cb) => nodeD.id(cb),
          (cb) => nodeE.id(cb)
        ], (err, ids) => {
          expect(err).to.not.exist()
          addrB = ids[0].addresses[0]
          addrC = ids[1].addresses[0]
          addrD = ids[2].addresses[0]
          addrE = ids[3].addresses[0]
          parallel([
            (cb) => nodeA.swarm.connect(addrB, cb),
            (cb) => nodeB.swarm.connect(addrC, cb),
            (cb) => nodeB.swarm.connect(addrD, cb),
            (cb) => nodeB.swarm.connect(addrE, cb)
          ], done)
        })
      })
    })

    after((done) => parallel(nodes.map((node) => (cb) => node.stop(err => {
      err && err.message === "Already stopped" ? cb() : cb(err)
    })), done))

    it('should fail when - add a file in A, fetch in C, fetch through B in D ', async function () {
      this.timeout(5 * 1000)
      const file = {
        path: 'testfile1.txt',
        content: Buffer.from('hello cache')
      }

      const filesAdded = await nodeA.add(file)
      await nodeC.cat(filesAdded[0].hash)
      await nodeE.cat(filesAdded[0].hash)
      await nodeA.stop()
      await nodeC.stop()
      await nodeE.stop()
      //Should timeout
      // TODO: Find a way to expect timout from cat
      const fetched = await nodeD.cat(filesAdded[0].hash)
    })
  })
})
