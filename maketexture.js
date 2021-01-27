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
  return {pointStyle, lineStyle, areaStyle}
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
