var partition = require('partition-array')
var featureList = require('georender-pack/features.json')
var featureCount = featureList.length

module.exports = Prepare

function Prepare(opts) {
  if (!(this instanceof Prepare)) return new Prepare(opts)
  this.style = opts.styleTexture
  this.pixels = opts.stylePixels
  this.data = opts.decoded
  this.zoomCount = opts.zoomEnd - opts.zoomStart
  this.indexes = {
    point: new Uint32Array(this.data.point.types.length),
    line: new Uint32Array(this.data.line.types.length),
    area: new Uint32Array(this.data.area.types.length),
    areaborder: new Uint32Array(this.data.areaborder.types.length)
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
  for (var i=0; i<this.indexes.areaborder.length; i++) {
    this.indexes.areaborder[i] = i
  }
  var pointIndexes = makeIndexes(this.data.point.ids)
  var lineIndexes = makeIndexes(this.data.line.ids)
  var areaIndexes = makeIndexes(this.data.area.ids)
  var areaborderIndexes = makeIndexes(this.data.areaborder.ids)
  this.ldistances = [0,0]
  var ldistx = 0
  var ldisty = 0
  var lids = this.data.line.ids
  var lposits = this.data.line.positions
  for (var i=0;i<lids.length-1;i++){
    if (lids[i] === lids[i+1]) {
      ldistx += Math.abs(lposits[2*i] - lposits[2*i+2])
      ldisty += Math.abs(lposits[2*i+1] - lposits[2*i+3])
    }
    else {
      ldistx = 0
      ldisty = 0
    }
    if (isNaN(ldistx) || isNaN(ldisty)){
      ldistx = 0
      ldisty = 0
    }
    this.ldistances.push(ldistx, ldisty)
  }

  this.aldistances = [0,0]
  var aldistx = 0
  var aldisty = 0
  var alids = this.data.areaborder.ids
  var alposits = this.data.areaborder.positions
  for (var i=0;i<alids.length-1;i++){
    if (alids[i] === alids[i+1]) {
      aldistx += Math.abs(alposits[2*i] - alposits[2*i+2])
      aldisty += Math.abs(alposits[2*i+1] - alposits[2*i+3])
    }
    else {
      aldistx = 0
      aldisty = 0
    }
    if (isNaN(aldistx) || isNaN(aldisty)){
      aldistx = 0
      aldisty = 0
    }
    this.aldistances.push(aldistx, aldisty)
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
      indexes: null,
      indexToId: null,
      idToIndex: null,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    pointP: {
      positions: null,
      types: null,
      id: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    line: {
      positions: null,
      types: null,
      id: null,
      normals: this.data.line.normals,
      distances: this.ldistances,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
    },
    lineT: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      distances: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      labels: this.data.line.labels,
      style: this.style,
      featureCount
    },
    lineP: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      distances: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      labels: this.data.line.labels,
      style: this.style,
      featureCount
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
      cells: null,
      labels: this.data.area.labels,
      style: this.style,
      featureCount
    },
    areaP: {
      positions: this.data.area.positions,
      types: this.data.area.types,
      indexes: areaIndexes.indexes,
      id: this.data.area.ids,
      indexToId: areaIndexes.indexToId,
      idToIndex: areaIndexes.idToIndex,
      cells: null,
      labels: this.data.area.labels,
      style: this.style,
      featureCount
    },
    areaborder: {
      positions: null,
      types: null,
      id: null,
      normals: this.data.areaborder.normals,
      distances: this.aldistances,
      //indexes: areaborderIndexes.indexes,
      //indexToId: areaborderIndexes.indexToId,
      //idToIndex: areaborderIndexes.idToIndex,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      style: this.style,
      featureCount,
    },
    areaborderT: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      distances: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      style: this.style,
      featureCount
    },
    areaborderP: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      distances: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      style: this.style,
      featureCount
    },
  }
}
Prepare.prototype._splitSort = function (key, zoom) {
  var self = this
  var tkey = key+'T'
  var pkey = key+'P'
  var splitT = partition(this.indexes[key], function (i) {
    var opacity = self.getOpacity(key, self.data[key].types[i], zoom)
    return opacity > 100
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
  if (self.props[key].distances) {
    self.props[tkey].distances = []
    self.props[pkey].distances = []
  }
  for (var i=0; i<self.indexes[tkey].length; i++) {
    self.props[tkey].id.push(self.data[key].ids[self.indexes[tkey][i]])
    self.props[tkey].types.push(self.data[key].types[self.indexes[tkey][i]])
    self.props[tkey].positions.push(self.data[key].positions[self.indexes[tkey][i]*2])
    self.props[tkey].positions.push(self.data[key].positions[self.indexes[tkey][i]*2+1])
    if (self.props[key].normals) {
      self.props[tkey].normals.push(self.data[key].normals[self.indexes[tkey][i]*2])
      self.props[tkey].normals.push(self.data[key].normals[self.indexes[tkey][i]*2+1])
    }
    if (self.props[key].distances) {
      if (self.ldistances) {
        self.props[tkey].distances.push(self.ldistances[self.indexes[tkey][i]*2])
        self.props[tkey].distances.push(self.ldistances[self.indexes[tkey][i]*2+1])
      }
      if (self.aldistances) {
        self.props[tkey].distances.push(self.aldistances[self.indexes[tkey][i]*2])
        self.props[tkey].distances.push(self.aldistances[self.indexes[tkey][i]*2+1])
      }
    }
  }
  for (var i=0; i<self.indexes[pkey].length; i++) {
    self.props[pkey].id.push(self.data[key].ids[self.indexes[pkey][i]])
    self.props[pkey].types.push(self.data[key].types[self.indexes[pkey][i]])
    self.props[pkey].positions.push(self.data[key].positions[self.indexes[pkey][i]*2])
    self.props[pkey].positions.push(self.data[key].positions[self.indexes[pkey][i]*2+1])
    if (self.props[pkey].normals) {
      self.props[pkey].normals.push(self.data[key].normals[self.indexes[pkey][i]*2])
      self.props[pkey].normals.push(self.data[key].normals[self.indexes[pkey][i]*2+1])
    }
    if (self.props[pkey].distances) {
      if (self.ldistances) {
        self.props[pkey].distances.push(self.ldistances[self.indexes[pkey][i]*2])
        self.props[pkey].distances.push(self.ldistances[self.indexes[pkey][i]*2+1])
      }
      if (self.aldistances) {
        self.props[pkey].distances.push(self.aldistances[self.indexes[pkey][i]*2])
        self.props[pkey].distances.push(self.aldistances[self.indexes[pkey][i]*2+1])
      }
    }
  }
  //figure out area line indexes
  var tindexes = makeIndexes(self.props[tkey].id)
  var pindexes = makeIndexes(self.props[pkey].id)
  self.props[tkey].indexes = tindexes.indexes
  self.props[tkey].indexToId = tindexes.indexToId
  self.props[tkey].idToIndex = tindexes.idToIndex
  self.props[pkey].indexes = pindexes.indexes
  self.props[pkey].indexToId = pindexes.indexToId
  self.props[pkey].idToIndex = pindexes.idToIndex
}
Prepare.prototype._splitSortArea = function (key, zoom) {
  var self = this
  var tkey = key+'T'
  var pkey = key+'P'
  self.props[tkey].cells = []
  self.props[pkey].cells = []
  var cells = self.data[key].cells
  for (var i=0; i<cells.length; i+=3) {
    var type = self.data[key].types[cells[i]]
    var opacity = self.getOpacity(key, type, zoom)
    if (opacity < 100) {
      self.props[tkey].cells.push(cells[i], cells[i+1], cells[i+2])
    }
    else {
      self.props[pkey].cells.push(cells[i], cells[i+1], cells[i+2])
    }
  }
}

Prepare.prototype.update = function (zoom) {
  var self = this
  this._splitSort('point', zoom)
  this._splitSort('line', zoom)
  this._splitSort('areaborder', zoom)
  this._splitSortArea('area', zoom)
  return this.props
}

Prepare.prototype.getOpacity = function (key, type, zoom) {
  if (key === 'point') {
    var y = zoom * 2
  }
  else if (key === 'line') {
    var y = zoom * 2 + this.zoomCount * 2
  }
  else if (key === 'area') {
    var y = zoom * 2 + this.zoomCount * 2 + this.zoomCount * 4
  }
  var index = (type + y * featureCount)*4 + 3
  return this.pixels[index]
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
