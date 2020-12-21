var hextorgb = require('hex-to-rgb')
var featureList = require('georender-pack/features.json')
var defaults = require('./defaults.json')

var styleCount = Object.keys(featureList).length

module.exports = function (decoded, styleProps) {
  var styleFeatures = Object.keys(styleProps)
  var size = new Float32Array(2)
  var lw

  var pointStyle = new Float32Array(4*styleCount)
  for (var x = 0; x < styleCount; x ++) {
    var h = parseHex(getStyle(styleProps, styleFeatures[x], "point-fill-color"))
    pointStyle[x*4+0] = h[0] //r
    pointStyle[x*4+1] = h[1] //g
    pointStyle[x*4+2] = h[2] //b
    pointStyle[x*4+3] = getStyle(styleProps, styleFeatures[x], "point-size")
  }

  var lineStyle = new Float32Array(4*3*styleCount)
  var i = 0;
  for (var x = 0; x < styleCount; x++) {
    var h = parseHex(getStyle(styleProps, styleFeatures[x], "line-fill-color"))
    lineStyle[i++] = h[0] //r
    lineStyle[i++] = h[1] //g
    lineStyle[i++] = h[2] //b
    lineStyle[i++] = getStyle(styleProps, styleFeatures[x], "line-fill-width")
  }
  for (var x = 0; x < styleCount; x++) {
    var h = parseHex(getStyle(styleProps, styleFeatures[x], "line-stroke-color"))
    lineStyle[i++] = h[0] //r
    lineStyle[i++] = h[1] //g
    lineStyle[i++] = h[2] //b
    lineStyle[i++] = getStyle(styleProps, styleFeatures[x], "line-stroke-width")
  }
  for (var x = 0; x < styleCount; x++) {
    lineStyle[i++] = parseLineStyle(styleProps, styleFeatures[x], 'fill')
    if (getStyle(styleProps, styleFeatures[x], "line-fill-style") === "solid"){ lineStyle[i++] = 0 }
    else lineStyle[i++] = getStyle(styleProps, styleFeatures[x], "line-fill-dash-gap")
    lineStyle[i++] = parseLineStyle(styleProps, styleFeatures[x], 'stroke')
    if (getStyle(styleProps, styleFeatures[x], "line-stroke-style") === "solid"){ lineStyle[i++] = 0 }
    else lineStyle[i++] = getStyle(styleProps, styleFeatures[x], "line-stroke-dash-gap")
  }

  var areaStyle = new Float32Array(4*styleCount)
  for (var x = 0; x < styleCount; x++) {
    var h = parseHex(getStyle(styleProps, styleFeatures[x], "area-fill-color"))
    areaStyle[x*4+0] = h[0] //r
    areaStyle[x*4+1] = h[1] //g
    areaStyle[x*4+2] = h[2] //b
    areaStyle[x*4+3] = 0 //a
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
  //console.log(lposits.length, distances.length)

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
      indexes: indexes,
      //id: decoded.area.ids,
      indexToId,
      idToIndex,
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

function parseLineStyle (styleProps, type, property) {
  var style = getStyle(styleProps, type, `line-${property}-style`)
  var dashLength = 1.0
  var x = getStyle(styleProps, type, `line-${property}-dash-length`)

  if (x === "short") dashLength = 1.0
  if (x === "medium") dashLength = 1.5
  if (x === "long") dashLength = 2.0

  if (style === "solid") return 1.0 
  if (style === "dot") return 0.6
  if (style === "dash") return dashLength
  else return 0
}

function getStyle (styleProps, type, property) {
  if (styleProps[type] && styleProps[type][property] !== undefined) {
    return styleProps[type][property]
  }
  if (type !== undefined) {
    var dtype = type.split('.')[0]+'.*'
    if (styleProps[dtype] && styleProps[dtype][property] !== undefined) {
      return styleProps[dtype][property]
    }
  }
  if (styleProps['*'] && styleProps['*'][property] !== undefined) {
    return styleProps['*'][property]
  }
  return defaults[property]
}
