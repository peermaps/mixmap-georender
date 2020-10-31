var hextorgb = require('hex-to-rgb')
var featureList = require('./features.json')
var styleProps = require('./stylesheet.json')

var styleFeatures = Object.keys(styleProps)
var styleCount = styleFeatures.length

module.exports = function (decoded) {
  var size = new Float32Array(2)
  var lw

  var pointStyle = new Float32Array(4*styleCount)
  for (var x = 0; x < pointStyle.length/4; x += 4) {
    pointStyle[x+0] = parseHex(styleProps[styleFeatures[x]]["point-fill-color"])[0] //r
    pointStyle[x+1] = parseHex(styleProps[styleFeatures[x]]["point-fill-color"])[1] //g
    pointStyle[x+2] = parseHex(styleProps[styleFeatures[x]]["point-fill-color"])[2] //b
    pointStyle[x+3] = styleProps[styleFeatures[x]]["point-size"]
  }

  var lineStyle = new Float32Array(4*2*styleCount)
  var i = 0;
  for (var x = 0; x < lineStyle.length/8; x++) {
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[0] //r
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[1] //g
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[2] //b
    lineStyle[i++] = styleProps[styleFeatures[x]]["line-width"] //linewidth
  }
  for (var x = 0; x < lineStyle.length/8; x++) {
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[0] //r
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[1] //g
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[2] //b
    lineStyle[i++] = styleProps[styleFeatures[x]]["line-stroke-width"] //linestrokewidth
  }

  var areaStyle = new Float32Array(4*styleCount)
  for (var x = 0; x < areaStyle.length/4; x += 4) {
    areaStyle[x+0] = parseHex(styleProps[styleFeatures[x]]["area-fill-color"])[0] //r
    areaStyle[x+1] = parseHex(styleProps[styleFeatures[x]]["area-fill-color"])[1] //g
    areaStyle[x+2] = parseHex(styleProps[styleFeatures[x]]["area-fill-color"])[2] //b
    areaStyle[x+3] = 0 //a
  }

  var indexToId = {}
  var idToIndex = {}
  var indexes = new Float32Array(decoded.area.ids.length)
  var x = 1
  decoded.area.ids.forEach(function (id) {
    if (!idToIndex.hasOwnProperty(id)) {
      idToIndex[id] = x
      indexToId[x] = id
      x++
    }
  })
  decoded.area.ids.forEach(function (id, i) {
    indexes[i] = idToIndex[id]
  })
  /*
  var lineCounter = 0
  decoded.line.positions.forEach(function (pos, i) {
    if (decoded.line.ids[i] === decoded.line.ids[i-1]) {
      console.log(decoded.line.ids[i])
    }
  })
  */

  return {
    point: {
      positions: decoded.point.positions,
      types: decoded.point.types,
      id: decoded.point.ids,
      labels: decoded.point.labels,
      style: pointStyle,
      styleCount,
    },
    lineStroke: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: lineStyle,
      styleCount,
      zindex: 1.0
    },
    lineFill: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: lineStyle,
      styleCount,
      zindex: 2.0
    },
    area: {
      positions: decoded.area.positions,
      types: decoded.area.types,
      id: indexes,
      cells: decoded.area.cells,
      labels: decoded.area.labels,
      style: areaStyle,
      styleCount,
    }
  }
}

function parseHex (hex) {
  return hex.match(/([0-9a-f]{2})/ig).map(s => parseInt(s,16)/255)
}
