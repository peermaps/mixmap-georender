var hextorgb = require('hex-to-rgb')
var featureList = require('georender-pack/features.json')
var defaults = require('./defaults.json')
var evalExpr = require('./lib/expr.js')

var styleCount = Object.keys(featureList).length
var zoomStart = 1
var zoomEnd = 21 //inclusive
var zoomCount = zoomEnd - zoomStart + 1

module.exports = function (decoded, styleProps) {
  preProcess(styleProps)
  console.log(styleProps)
  var styleFeatures = Object.keys(featureList)
  var lw

  var pointStyle = new Float32Array(4*styleCount*zoomCount)
  var poffset = 0
  for (var y = zoomStart; y <= zoomEnd; y++) {
    for (var x = 0; x < styleCount; x++) {
      var h = parseHex(getStyle(styleProps, styleFeatures[x], "point-fill-color", y))
      pointStyle[poffset++] = h[0] //r
      pointStyle[poffset++] = h[1] //g
      pointStyle[poffset++] = h[2] //b
      pointStyle[poffset++] = getStyle(styleProps, styleFeatures[x], "point-size", y)
    }
  }

  var lineStyle = new Float32Array(4*3*styleCount*zoomCount)
  var loffset = 0
  for (var y = zoomStart; y <= zoomEnd; y++) {
    for (var x = 0; x < styleCount; x++) {
      var h = parseHex(getStyle(styleProps, styleFeatures[x], "line-fill-color", y))
      lineStyle[loffset++] = h[0] //r
      lineStyle[loffset++] = h[1] //g
      lineStyle[loffset++] = h[2] //b
      lineStyle[loffset++] = getStyle(styleProps, styleFeatures[x], "line-fill-width", y)
    }
    for (var x = 0; x < styleCount; x++) {
      var h = parseHex(getStyle(styleProps, styleFeatures[x], "line-stroke-color", y))
      lineStyle[loffset++] = h[0] //r
      lineStyle[loffset++] = h[1] //g
      lineStyle[loffset++] = h[2] //b
      lineStyle[loffset++] = getStyle(styleProps, styleFeatures[x], "line-stroke-width", y)
    }
    for (var x = 0; x < styleCount; x++) {
      lineStyle[loffset++] = parseLineStyle(styleProps, styleFeatures[x], 'fill')
      if (getStyle(styleProps, styleFeatures[x], "line-fill-style", y) === "solid") {
        lineStyle[loffset++] = 0
      }
      else lineStyle[loffset++] = getStyle(styleProps, styleFeatures[x], "line-fill-dash-gap", y)
      lineStyle[loffset++] = parseLineStyle(styleProps, styleFeatures[x], 'stroke')
      if (getStyle(styleProps, styleFeatures[x], "line-stroke-style", y) === "solid") {
        lineStyle[loffset++] = 0
      }
      else lineStyle[loffset++] = getStyle(styleProps, styleFeatures[x], "line-stroke-dash-gap", y)
    }
  }

  var areaStyle = new Float32Array(4*styleCount*zoomCount)
  var aoffset = 0
  for (var y = zoomStart; y <= zoomEnd; y++) {
    for (var x = 0; x < styleCount; x++) {
      var h = parseHex(getStyle(styleProps, styleFeatures[x], "area-fill-color", y))
      areaStyle[aoffset++] = h[0] //r
      areaStyle[aoffset++] = h[1] //g
      areaStyle[aoffset++] = h[2] //b
      areaStyle[aoffset++] = 0 //a
    }
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
  //console.log(decoded.area.types[idToIndex[5062505]])

  return {
    point: {
      positions: decoded.point.positions,
      types: decoded.point.types,
      id: decoded.point.ids,
      labels: decoded.point.labels,
      style: pointStyle,
      styleCount,
      zoomStart,
      zoomEnd,
      zoomCount,
      texHeight: 1*zoomCount,
    },
    lineStroke: {
      positions: decoded.line.positions,
      types: decoded.line.types,
      normals: decoded.line.normals,
      id: decoded.line.ids,
      labels: decoded.line.labels,
      style: lineStyle,
      styleCount,
      texHeight: 3*zoomCount,
      zindex: 2.0,
      zoomStart,
      zoomEnd,
      zoomCount,
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
      texHeight: 3*zoomCount,
      zindex: 3.0,
      zoomStart,
      zoomEnd,
      zoomCount,
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
      texHeight: 1*zoomCount,
      zoomStart,
      zoomEnd,
      zoomCount,
      zindex: 1.0,
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

function getStyle (styleProps, type, property, zoom) {
  var x = getProp(styleProps[type], property, zoom)
  if (x !== undefined) return x
  if (type !== undefined) {
    var dtype = type.split('.')[0]+'.*'
    var y = getProp(styleProps[dtype], property, zoom)
    if (y !== undefined) return y
  }
  var z = getProp(styleProps['*'], property, zoom)
  if (z !== undefined) return z
  else return defaults[property]
}

function getProp (rules, property, zoom) {
  if (!rules) return undefined
  var zkey = property + "[zoom=" + zoom + "]"
  if (rules[zkey] !== undefined) {
    return rules[zkey]
  }
  if (rules[property] !== undefined) {
    return rules[property]
  }
}

function preProcess (styleProps) {
  var vars = { zoom: 0 }
  var keys = Object.keys(styleProps)
  for (var i=0; i<keys.length; i++) {
    var pkeys = Object.keys(styleProps[keys[i]])
    for (var j=0; j<pkeys.length; j++) {
      var m = /([\w-]+)(?:\s*\[([^\]]*)\]\s*)/.exec(pkeys[j])
      if (!m) continue
      for (var zoom=zoomStart; zoom<=zoomEnd; zoom++) {
        vars.zoom = zoom
        if (!evalExpr(m[2], vars)) continue
        var zkey = m[1] + "[zoom=" + zoom + "]"
        styleProps[keys[i]][zkey] = styleProps[keys[i]][pkeys[j]]
      }
    }
  }
  return styleProps
}
