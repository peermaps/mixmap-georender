var partition = require('partition-array')
var featureList = require('georender-pack/features.json')
var featureCount = featureList.length

module.exports = Prepare

function Prepare(opts) {
  if (!(this instanceof Prepare)) return new Prepare(opts)
  this.style = opts.styleTexture
  this.pixels = opts.stylePixels
  this.data = opts.decoded
  this.indexes = {
    point: new Uint32Array(this.data.point.types.length),
    line: new Uint32Array(this.data.line.types.length),
    area: new Uint32Array(this.data.area.types.length)
  }
  for (var i=0; i<this.indexes.point.length; i++) {
    this.indexes.point[i] = i 
  }
  for (var i=0; i<this.indexes.line.length; i++) {
    this.indexes.line[i] = i 
  }
  for (var i=0; i<this.indexes.area.length; i++) {
    this.indexes.area[i] = i 
  }
  var pointIndexes = makeIndexes(this.data.point.ids)
  var lineIndexes = makeIndexes(this.data.line.ids)
  var areaIndexes = makeIndexes(this.data.area.ids)
  var distances = [0,0]
  var distx = 0
  var disty = 0
  var lids = this.data.line.ids
  var lposits = this.data.line.positions
  for (var i=0;i<lids.length-1;i++){
    if (lids[i] === lids[i+1]) {
      distx += Math.abs(lposits[2*i] - lposits[2*i+2])
      disty += Math.abs(lposits[2*i+1] - lposits[2*i+3])
    }
    else {
      distx = 0
      disty = 0
    }
    if (isNaN(distx) || isNaN(disty)){
      distx = 0
      disty = 0
    }
    distances.push(distx, disty)
  }
  this.props = {
    point: {
      positions: null,
      types: null,
      id: null,
      indexes: pointIndexes.indexes,
      indexToId: pointIndexes.indexToId,
      idToIndex: pointIndexes.idToIndex,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    pointT: {
      positions: null,
      types: null,
      id: null,
      indexes: pointIndexes.indexes,
      indexToId: pointIndexes.indexToId,
      idToIndex: pointIndexes.idToIndex,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    pointP: {
      positions: null,
      types: null,
      id: null,
      indexes: pointIndexes.indexes,
      indexToId: pointIndexes.indexToId,
      idToIndex: pointIndexes.idToIndex,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    line: {
      positions: null,
      types: null,
      id: null,
      normals: this.data.line.normals,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
      distances,
    },
    lineT: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
      distances,
    },
    lineP: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
      distances,
    },
    area: {
      positions: this.data.area.positions,
      types: this.data.area.types,
      indexes: areaIndexes.indexes,
      id: this.data.area.ids,
      indexToId: areaIndexes.indexToId,
      idToIndex: areaIndexes.idToIndex,
      cells: this.data.area.cells,
      labels: this.data.area.labels,
      style: this.style,
      featureCount
    },
    areaT: {
      positions: this.data.area.positions,
      types: this.data.area.types,
      indexes: areaIndexes.indexes,
      id: this.data.area.ids,
      indexToId: areaIndexes.indexToId,
      idToIndex: areaIndexes.idToIndex,
      cells: this.data.area.cells,
      labels: this.data.area.labels,
      style: this.style,
      featureCount
    }
  }
}
Prepare.prototype._splitSort = function (key, zoom) {
  var self = this
  var tkey = key+'T'
  var pkey = key+'P'
  var splitT = partition(this.indexes[key], function (i) {
    var x = self.data[key].types[i]
    var y = zoom * 2
    var index = (x + y * featureCount)*4 + 3
    return self.pixels[index] < 100
  })
  this.indexes[tkey] = this.indexes[key].subarray(0, splitT)
  this.indexes[pkey] = this.indexes[key].subarray(splitT)
  this.indexes[tkey].sort(function (a, b) {
    var xa = self.data[key].types[a]
    var xb = self.data[key].types[b]
    var zindexa = self.pixels[(xa + (zoom * 2 + 1) * featureCount)*4 + 1]
    var zindexb = self.pixels[(xb + (zoom * 2 + 1) * featureCount)*4 + 1]
    return zindexa - zindexb
  })
  self.props[tkey].id = []
  self.props[tkey].types = []
  self.props[tkey].positions = []
  self.props[pkey].id = []
  self.props[pkey].types = []
  self.props[pkey].positions = []
  if (self.props[key].normals) {
    self.props[tkey].normals = []
    self.props[pkey].normals = []
  }
  var j=0
  for (var i=0; i<self.indexes[tkey].length; i++) {
    self.props[tkey].id.push(self.data[key].ids[self.indexes[tkey][i]])
    self.props[tkey].types.push(self.data[key].types[self.indexes[tkey][i]])
    self.props[tkey].positions.push(self.data[key].positions[self.indexes[tkey][i]*2])
    self.props[tkey].positions.push(self.data[key].positions[self.indexes[tkey][i]*2+1])
    if (self.props[key].normals) {
      self.props[tkey].normals.push(self.data[key].normals[self.indexes[tkey][i]*2])
      self.props[tkey].normals.push(self.data[key].normals[self.indexes[tkey][i]*2+1])
    }
  }
  for (var i=0; i<self.indexes[pkey].length; i++) {
    self.props[pkey].id.push(self.data[key].ids[self.indexes[pkey][i]])
    self.props[pkey].types.push(self.data[key].types[self.indexes[pkey][i]])
    self.props[pkey].positions.push(self.data[key].positions[self.indexes[pkey][i]*2])
    self.props[pkey].positions.push(self.data[key].positions[self.indexes[pkey][i]*2+1])
    if (self.props[key].normals) {
      self.props[pkey].normals.push(self.data[key].normals[self.indexes[pkey][i]*2])
      self.props[pkey].normals.push(self.data[key].normals[self.indexes[pkey][i]*2+1])
    }
  }
}
Prepare.prototype.update = function (zoom) {
  var self = this
  this._splitSort('point', zoom)
  this._splitSort('line', zoom)
  return this.props
}

function makeIndexes (ids) { 
  var indexToId = {}
  var idToIndex = {}
  var indexes = new Float32Array(ids.length)
  var x = 1
  ids.forEach(function (id) {
    if (!idToIndex.hasOwnProperty(id)) {
      idToIndex[id] = x
      indexToId[x] = id
      x++
    }
  })
  ids.forEach(function (id, i) {
    indexes[i] = idToIndex[id]
  })
  return {
    indexes: indexes,
    idToIndex: idToIndex,
    indexToId: indexToId
  }
}
