var hextorgb = require('hex-to-rgb')
var featureList = require('./features.json')
var styleProps = require('./teststylesheet.json')

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

  var lineStyle = new Float32Array(4*3*styleCount)
  var i = 0;
  for (var x = 0; x < lineStyle.length/12; x++) {
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[0] //r
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[1] //g
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-fill-color"])[2] //b
    lineStyle[i++] = styleProps[styleFeatures[x]]["line-fill-width"] //linewidth
  }
  for (var x = 0; x < lineStyle.length/12; x++) {
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[0] //r
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[1] //g
    lineStyle[i++] = parseHex(styleProps[styleFeatures[x]]["line-stroke-color"])[2] //b
    lineStyle[i++] = styleProps[styleFeatures[x]]["line-stroke-width"] //linestrokewidth
  }
  for (var x = 0; x < lineStyle.length/12; x++) {
    lineStyle[i++] = parseLineStyle(styleProps[styleFeatures[x]], 'fill') //linefillstyle
    lineStyle[i++] = styleProps[styleFeatures[x]]["line-fill-dash-gap"]
    lineStyle[i++] = parseLineStyle(styleProps[styleFeatures[x]], 'stroke') //linestrokestyle
    lineStyle[i++] = styleProps[styleFeatures[x]]["line-stroke-dash-gap"]
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
  console.log(lposits.length, distances.length)

  return {
    point: {
      positions: decoded.point.positions,
      types: decoded.point.types,
      id: decoded.point.ids,
      labels: decoded.point.labels,
      style: pointStyle,
      styleCount,
      texHeight: 1,
    },
    lineStroke: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: lineStyle,
      styleCount,
      texHeight: 3,
      zindex: 1.0,
      distances,
    },
    lineFill: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: lineStyle,
      styleCount,
      texHeight: 3,
      zindex: 2.0,
      distances,
    },
    area: {
      positions: decoded.area.positions,
      types: decoded.area.types,
      id: indexes,
      cells: decoded.area.cells,
      labels: decoded.area.labels,
      style: areaStyle,
      styleCount,
      texHeight: 1,
    }
  }
}

function parseHex (hex) {
  return hex.match(/([0-9a-f]{2})/ig).map(s => parseInt(s,16)/255)
}

function parseLineStyle (props, name) {
  var style = props[`line-${name}-style`]
  var dashLength = 1.0

  if (props[`line-${name}-dash-length`] === "short") dashLength = 1.0
  if (props[`line-${name}-dash-length`] === "medium") dashLength = 1.5 
  if (props[`line-${name}-dash-length`] === "long") dashLength = 2.0

  if (style === "solid") return 0
  if (style === "dot") return 0.6
  if (style === "dash") return dashLength
  else return 0
}
