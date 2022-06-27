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
  this.imageSize = opts.imageSize
  this.indexes = {
    point: new Uint32Array(this.data.point.types.length),
    line: new Uint32Array(this.data.line.types.length),
    area: new Uint32Array(this.data.area.types.length),
    areaBorder: new Uint32Array(this.data.areaBorder.types.length)
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
  for (var i=0; i<this.indexes.areaBorder.length; i++) {
    this.indexes.areaBorder[i] = i
  }
  var pointIndexes = makeIndexes(this.data.point.ids)
  var lineIndexes = makeIndexes(this.data.line.ids)
  var areaIndexes = makeIndexes(this.data.area.ids)
  var areaBorderIndexes = makeIndexes(this.data.areaBorder.ids)
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

  this.abdistances = [0,0]
  var abdistx = 0
  var abdisty = 0
  var abids = this.data.areaBorder.ids
  var abposits = this.data.areaBorder.positions
  for (var i=0;i<abids.length-1;i++){
    if (abids[i] === abids[i+1]) {
      abdistx += Math.abs(abposits[2*i] - abposits[2*i+2])
      abdisty += Math.abs(abposits[2*i+1] - abposits[2*i+3])
    }
    else {
      abdistx = 0
      abdisty = 0
    }
    if (isNaN(abdistx) || isNaN(abdisty)){
      abdistx = 0
      abdisty = 0
    }
    this.abdistances.push(abdistx, abdisty)
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
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
      imageSize: this.imageSize,
      featureCount
    },
    areaBorder: {
      positions: null,
      types: null,
      id: null,
      normals: this.data.areaBorder.normals,
      distances: this.abdistances,
      //indexes: areaBorderIndexes.indexes,
      //indexToId: areaBorderIndexes.indexToId,
      //idToIndex: areaBorderIndexes.idToIndex,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      style: this.style,
      imageSize: this.imageSize,
      featureCount,
    },
    areaBorderT: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      distances: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      style: this.style,
      imageSize: this.imageSize,
      featureCount
    },
    areaBorderP: {
      positions: null,
      types: null,
      id: null,
      normals: null,
      distances: null,
      indexes: null,
      indexToId: null,
      idToIndex: null,
      style: this.style,
      imageSize: this.imageSize,
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
    return opacity >= 100
  })

  this.indexes[tkey] = this.indexes[key].subarray(0, splitT)
  this.indexes[pkey] = this.indexes[key].subarray(splitT)
  this.indexes[tkey].sort(function (a, b) {
    var xa = self.data[key].types[a]
    var xb = self.data[key].types[b]
    var zindexa = self.pixels[(xa + (zoom * 2 + 1) * self.imageSize[0])*4 + 1]
    var zindexb = self.pixels[(xb + (zoom * 2 + 1) * self.imageSize[0])*4 + 1]
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
      if (key === 'line') {
        self.props[tkey].distances.push(this.ldistances[self.indexes[tkey][i]*2])
        self.props[tkey].distances.push(this.ldistances[self.indexes[tkey][i]*2+1])
      }
      else if (key === 'areaBorder') {
        self.props[tkey].distances.push(this.abdistances[self.indexes[tkey][i]*2])
        self.props[tkey].distances.push(this.abdistances[self.indexes[tkey][i]*2+1])
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
    if (self.props[key].distances) {
      if (key === 'line') {
        self.props[pkey].distances.push(this.ldistances[self.indexes[pkey][i]*2])
        self.props[pkey].distances.push(this.ldistances[self.indexes[pkey][i]*2+1])
      }
      else if (key === 'areaBorder') {
        self.props[pkey].distances.push(this.abdistances[self.indexes[pkey][i]*2])
        self.props[pkey].distances.push(this.abdistances[self.indexes[pkey][i]*2+1])
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
  this._splitSort('areaBorder', zoom)
  this._splitSortArea('area', zoom)
  return this.props
}

Prepare.prototype.getOpacity = function (key, type, zoom) {
  if (key === 'point') {
    var y = zoom * 7
  }
  else if (key === 'line') {
    var y = zoom * 7 + this.zoomCount * 8
  }
  else if (key === 'area') {
    var y = zoom * 7 + this.zoomCount * 8 + this.zoomCount * 6
  }
  else if (key === 'areaBorder') {
    var y = zoom * 7 + this.zoomCount * 8 + this.zoomCount * 6 + this.zoomCount * 3
  }
  var index = (type + y * this.imageSize[0])*4 + 3
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
