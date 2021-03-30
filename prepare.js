var featureList = require('georender-pack/features.json')
var settings = require('georender-style2png/settings.js')()
var styleCount = Object.keys(featureList).length

var zoomStart = settings.zoomStart
var zoomEnd = settings.zoomEnd //inclusive
var zoomCount = zoomEnd - zoomStart + 1

module.exports = function (decoded, tex) {
  var pointIndexes = makeIndexes(decoded.point.ids)
  var lineIndexes = makeIndexes(decoded.line.ids)
  var areaIndexes = makeIndexes(decoded.area.ids)
  var distances = [0,0]
  var distx = 0
  var disty = 0
  var lids = decoded.line.ids
  var lposits = decoded.line.positions
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

  return {
    point: {
      positions: decoded.point.positions,
      types: decoded.point.types,
      indexes: pointIndexes.indexes,
      indexToId: pointIndexes.indexToId,
      idToIndex: pointIndexes.idToIndex,
      id: decoded.point.ids,
      labels: decoded.point.labels,
      style: tex,
      styleCount
    },
    lineStroke: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: tex,
      styleCount,
      distances,
    },
    lineFill: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      indexes: lineIndexes.indexes,
      indexToId: lineIndexes.indexToId,
      idToIndex: lineIndexes.idToIndex,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: tex,
      styleCount,
      distances,
    },
    area: {
      positions: decoded.area.positions,
      types: decoded.area.types,
      indexes: areaIndexes.indexes,
      id: decoded.area.ids,
      indexToId: areaIndexes.indexToId,
      idToIndex: areaIndexes.idToIndex,
      cells: decoded.area.cells,
      labels: decoded.area.labels,
      style: tex,
      styleCount
    }
  }
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
