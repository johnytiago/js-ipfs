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
}

function createNode (callback) {
  f.spawn({
    exec: require('../../src'),
    config,
    initOptions: { bits: 512 },
    EXPERIMENTAL: {
      startrail: true
    }
  }, callback)
}

describe('Startrail', () => {
  let nodeA
  let nodeB
  let nodeC
  let nodeD
  let addrB
  let addrC
  let addrD

  let nodes
  before(function (done) {
    this.timeout(40 * 1000)

    parallel([
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
      parallel([
        (cb) => nodeA.id(cb),
        (cb) => nodeB.id(cb),
        (cb) => nodeC.id(cb),
        (cb) => nodeD.id(cb)
      ], (err, ids) => {
        expect(err).to.not.exist()
        addrB = ids[1].addresses[0]
        addrC = ids[2].addresses[0]
        addrD = ids[3].addresses[0]
        parallel([
          (cb) => nodeA.swarm.connect(addrB, cb),
          (cb) => nodeB.swarm.connect(addrC, cb),
          (cb) => nodeB.swarm.connect(addrD, cb)
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
    await nodeA.stop()
    await nodeC.stop()
    const fetched = await nodeD.cat(filesAdded[0].hash)
    expect(fetched.toString()).to.eql('hello cache')
  })
})
