var partition = require('partition-array')
var getPixels = require('get-pixels-updated')
var featureList = require('georender-pack/features.json')
var featureCount = Object.keys(featureList).length

module.exports = Prepare

function Prepare(stylePixels, texture, decoded, zoom) {
  if (!(this instanceof Prepare)) return new Prepare(stylePixels, texture, decoded)
  this.style = texture
  this.pixels = stylePixels
  this.data = decoded
  this.indexes = {
    point: new Uint32Array(this.data.point.types.length),
    line: new Uint32Array(this.data.line.types.length),
    area: new Uint32Array(this.data.area.types.length)
  }
  this.ids = {}
  this.types = {
    point: new Float32Array(this.data.point.types.length),
    line: new Float32Array(this.data.line.types.length),
    area: new Float32Array(this.data.area.types.length)
  }
  this.positions = {
    pointT: new Float32Array(this.data.point.positions.length),
    pointP: new Float32Array(this.data.point.positions.length),
    line: new Float32Array(this.data.line.positions.length),
    area: new Float32Array(this.data.area.positions.length)
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
      positions: this.data.point.positions,
      types: this.data.point.types,
      indexes: pointIndexes.indexes,
      indexToId: pointIndexes.indexToId,
      idToIndex: pointIndexes.idToIndex,
      id: this.data.point.ids,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    lineStroke: {
      positions: this.data.line.positions,
      types: this.data.line.types,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      normals: this.data.line.normals,
      id: this.data.line.ids,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
      distances,
    },
    lineFill: {
      positions: this.data.line.positions,
      types: this.data.line.types,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      normals: this.data.line.normals,
      id: this.data.line.ids,
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
    pointT: {
      positions: this.data.point.positions,
      types: this.data.point.types,
      indexes: pointIndexes.indexes,
      indexToId: pointIndexes.indexToId,
      idToIndex: pointIndexes.idToIndex,
      id: this.data.point.ids,
      labels: this.data.point.labels,
      style: this.style,
      featureCount
    },
    lineStrokeT: {
      positions: this.data.line.positions,
      types: this.data.line.types,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      normals: this.data.line.normals,
      id: this.data.line.ids,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
      distances,
    },
    lineFillT: {
      positions: this.data.line.positions,
      types: this.data.line.types,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      normals: this.data.line.normals,
      id: this.data.line.ids,
      labels: this.data.line.labels,
      style: this.style,
      featureCount,
      distances,
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
Prepare.prototype.start = function (zoom) {
  return this.props
}
Prepare.prototype.update = function (zoom) {
  var self = this
  var splitP = partition(this.indexes.point, function (i) {
    var x = self.data.point.types[i]
    var y = zoom * 2
    var index = (x + y * featureCount)*4 + 3
    return self.pixels[index] < 100
  })
  this.indexes.pointT = this.indexes.point.subarray(0, splitP-1)
  this.indexes.pointP = this.indexes.point.subarray(splitP)
  this.ids.pointT = []
  this.ids.pointP = []
  this.types.pointT = this.indexes.point.subarray(0, splitP-1)
  this.types.pointP = this.indexes.point.subarray(splitP)
  this.indexes.pointT.sort(function (a, b) {
    var xa = self.data.point.types[a]
    var xb = self.data.point.types[b]
    var zindexa = self.pixels[(xa + (zoom * 2 + 1) * featureCount)*4 + 1]
    var zindexb = self.pixels[(xb + (zoom * 2 + 1) * featureCount)*4 + 1]
    return zindexa - zindexb
  })
  var splitL = partition(this.indexes.line, function (i) {
    var x = self.data.line.types[i]
    var y = zoom * 2
    var index = (x + y * featureCount)*4 + 3
    return self.pixels[index] < 100
  })
  this.indexes.lineT = this.indexes.line.subarray(0, splitL-1)
  this.indexes.lineP = this.indexes.line.subarray(splitL)
  this.indexes.lineT.sort(function (a, b) {
    var xa = self.data.line.types[a]
    var xb = self.data.line.types[b]
    var zindexa = self.pixels[(xa + (zoom * 2 + 1) * featureCount)*4 + 1]
    var zindexb = self.pixels[(xb + (zoom * 2 + 1) * featureCount)*4 + 1]
    return zindexa - zindexb
  })
  var splitA = partition(this.indexes.area, function (i) {
    var x = self.data.area.types[i]
    var y = zoom * 2
    var index = (x + y * featureCount)*4 + 3
    return self.pixels[index] < 100
  })
  this.indexes.areaT = this.indexes.area.subarray(0, splitA-1)
  this.indexes.areaP = this.indexes.area.subarray(splitA)
  this.indexes.areaT.sort(function (a, b) {
    var xa = self.data.area.types[a]
    var xb = self.data.area.types[b]
    var zindexa = self.pixels[(xa + (zoom * 2 + 1) * featureCount)*4 + 1]
    var zindexb = self.pixels[(xb + (zoom * 2 + 1) * featureCount)*4 + 1]
    return zindexa - zindexb
  })
  var j=0
  for (var i=0; i<self.indexes.pointT.length; i++) {
    var index = self.indexes.pointT[i]
    self.ids.pointT[i] = self.data.point.ids[index]
    self.types.pointT[i] = self.data.point.types[index]
    self.positions.pointT[j] = self.data.point.positions[index*2]
    self.positions.pointT[j+1] = self.data.point.positions[index*2+1]
    //if (i < 20) console.log(index, self.positions.pointT[j], self.positions.pointT[j+1])
    j+=2
  }
  var k=0
  for (var i=0; i<self.indexes.pointP.length; i++) {
    var index = self.indexes.pointP[i]
    self.ids.pointP[i] = self.data.point.ids[index]
    self.types.pointP[i] = self.data.point.types[index]
    self.positions.pointP[k] = self.data.point.positions[index*2]
    self.positions.pointP[k+1] = self.data.point.positions[index*2+1]
    k+=2
  }
  console.log(self.props.pointT.positions.length, self.positions.pointT.length)
  self.props.pointT.id = self.ids.pointT
  self.props.pointT.types = self.types.pointT
  self.props.pointT.positions = self.positions.pointT
  self.props.point.id = self.ids.pointP
  self.props.point.types = self.types.pointP
  self.props.point.positions = self.positions.pointP
  /*
  for (var i=0; i<this.indexes.pointT.length; i++) {
    var index = this.indexes.pointT[i]
    var type = self.data.point.types[index]
    var x = type
    var y = zoom * 2 + 1
    var pindex = (x + y * featureCount)*4 + 1
    var zindex = self.pixels[pindex]
  }
  */
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
