var featureList = require('georender-pack/features.json')
var defaults = require('./defaults.json')
var evalExpr = require('./lib/expr.js')
var zoomStart = 1
var zoomEnd = 21 //inclusive
var zoomCount = zoomEnd - zoomStart + 1
var styleCount = Object.keys(featureList).length

module.exports = function (styleProps) {
  preProcess(styleProps)
  var styleFeatures = Object.keys(featureList)
  var lw
  var heights = {
    point: zoomCount,
    line: 3*zoomCount,
    area: zoomCount
  }
  var totalHeight = heights.point + heights.line + heights.area
  var arrLength = 4*styleCount*totalHeight
  var r0 = heights.point/totalHeight
  var r1 = (heights.point + heights.line)/totalHeight
  var ranges = [
    [0, r0],
    [r0, r1],
    [r1, 1]
  ]

  var data = new Float32Array(arrLength)
  var offset = 0
  for (var y = zoomStart; y <= zoomEnd; y++) { //point
    for (var x = 0; x < styleCount; x++) {
      var a = parseHex(getStyle(styleProps, styleFeatures[x], "point-fill-color", y))
      data[offset++] = a[0] //r
      data[offset++] = a[1] //g
      data[offset++] = a[2] //b
      data[offset++] = getStyle(styleProps, styleFeatures[x], "point-size", y)
    }
  }
  for (var y = zoomStart; y <= zoomEnd; y++) { //line
    for (var x = 0; x < styleCount; x++) {
      var b = parseHex(getStyle(styleProps, styleFeatures[x], "line-fill-color", y))
      data[offset++] = b[0] //r
      data[offset++] = b[1] //g
      data[offset++] = b[2] //b
      data[offset++] = getStyle(styleProps, styleFeatures[x], "line-fill-width", y)
    }
    for (var x = 0; x < styleCount; x++) {
      var c = parseHex(getStyle(styleProps, styleFeatures[x], "line-stroke-color", y))
      data[offset++] = c[0] //r
      data[offset++] = c[1] //g
      data[offset++] = c[2] //b
      data[offset++] = getStyle(styleProps, styleFeatures[x], "line-stroke-width", y)
    }
    for (var x = 0; x < styleCount; x++) {
      data[offset++] = parseLineStyle(styleProps, styleFeatures[x], 'fill')
      if (getStyle(styleProps, styleFeatures[x], "line-fill-style", y) === "solid") {
        data[offset++] = 0
      }
      else data[offset++] = getStyle(styleProps, styleFeatures[x], "line-fill-dash-gap", y)
      data[offset++] = parseLineStyle(styleProps, styleFeatures[x], 'stroke')
      if (getStyle(styleProps, styleFeatures[x], "line-stroke-style", y) === "solid") {
        data[offset++] = 0
      }
      else data[offset++] = getStyle(styleProps, styleFeatures[x], "line-stroke-dash-gap", y)
    }
  }
  for (var y = zoomStart; y <= zoomEnd; y++) { //area
    for (var x = 0; x < styleCount; x++) {
      var d = parseHex(getStyle(styleProps, styleFeatures[x], "area-fill-color", y))
      data[offset++] = d[0] //r
      data[offset++] = d[1] //g
      data[offset++] = d[2] //b
      data[offset++] = 0 //a
    }
  }
  return { 
    data,
    width: styleCount,
    height: totalHeight,
    heights,
    ranges
  }
}

function parseHex (hex) {
  return hex.match(/([0-9a-f]{2})/ig).map(s => parseInt(s,16))
}

function parseLineStyle (styleProps, type, property) {
  var style = getStyle(styleProps, type, `line-${property}-style`)
  var dashLength = 10
  var x = getStyle(styleProps, type, `line-${property}-dash-length`)

  if (x === "short") dashLength = 10
  if (x === "medium") dashLength = 15
  if (x === "long") dashLength = 20

  if (style === "solid") return 10 
  if (style === "dot") return 6
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
