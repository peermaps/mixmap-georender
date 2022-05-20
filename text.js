var binPack = require('bin-pack')
var LabelEngine = require('label-placement-engine')
var labelPreset = {
  bbox: require('label-placement-engine/preset/bbox'),
  point: require('label-placement-engine/preset/point'),
  line: require('label-placement-engine/preset/line'),
  area: require('label-placement-engine/preset/area'),
}

module.exports = Text

function Text(opts) {
  if (!opts) opts = {}
  if (!(this instanceof Text)) return new Text(opts)

  this._font = opts.font || '15px helvetica, arial'
  this._fillStyle = 'black'
  this._lineWidth = 4
  this._strokeStyle = 'white'

  this._canvas = opts.canvas || document.createElement('canvas')
  this._texture = null
  this._uvs = null
  this._ctx = this._canvas.getContext('2d')
  this._labelEngine = LabelEngine({
    types: {
      bbox: labelPreset.bbox(),
      point: labelPreset.point({
        labelMargin: [10,10],
        pointSize: [10,10],
        pointMargin: [10,10],
        pointSeparation: [10,10],
      }),
      line: labelPreset.line({
        labelMargin: [10,10],
        lineSize: [10,10],
        lineMargin: [10,10],
        lineSeparation: [10,10],
        sides: ['center'],
      }),
      area: labelPreset.area({
        labelMargin: [10,10],
      }),
    }
  })
  this._props = {}
}

Text.prototype.update = function (props, map) {
  this._setFont()
  var viewboxWidthLon = map.viewbox[2] - map.viewbox[0]
  var viewboxHeightLat = map.viewbox[3] - map.viewbox[1]
  var labels = []
  labels.push({ type: 'bbox', bounds: map.viewbox })
  var ph = 4, pw = 4
  this._addPoint(map, labels, props.pointT, pw, ph)
  this._addPoint(map, labels, props.pointP, pw, ph)
  this._addLine(map, labels, props.lineT)
  this._addLine(map, labels, props.lineP)
  this._addArea(map, labels, props.areaT)
  this._addArea(map, labels, props.areaP)
  this._labelEngine.update(labels)

  var uvs = null
  if (this._uvs && this._uvs.length === this._labelEngine.data.positions.length) {
    uvs = this._uvs
  } else if (this._uvs && this._uvs.length > this._labelEngine.data.positions.length) {
    uvs = this._uvs.subarray(0,this._labelEngine.data.positions.length)
  } else {
    uvs = new Float32Array(this._labelEngine.data.positions.length)
    this._uvs = uvs
  }

  var bins = []
  for (var i = 0; i < labels.length; i++) {
    var x = labels[i]
    if (x.type !== 'point' && x.type !== 'line' && x.type !== 'area') continue
    if (this._labelEngine.visible[i] > 0.5) {
      bins.push({ i, width: x.widthPx+pw, height: x.heightPx+ph })
    }
  }

  var result = binPack(bins, { inPlace: true })
  this._canvas.width = Math.max(1, Math.ceil(result.width))
  this._canvas.height = Math.max(1, Math.ceil(result.height))
  this._setFont()
  var cw = Math.ceil(result.width - 1), ch = Math.ceil(result.height - 1)
  for (var i = 0; i < bins.length; i++) {
    var r = bins[i]
    var start = this._labelEngine.offsets.positions[r.i*2+0]
    var end = this._labelEngine.offsets.positions[r.i*2+1]
    var w = r.width, h = r.height
    var uvx = r.x - pw*0.5, uvy = r.y - ph*0.5
    uvs[start+0] = uvx / cw
    uvs[start+1] = 1.0 - uvy / ch
    uvs[start+2] = (uvx + r.width) / cw
    uvs[start+3] = 1.0 - uvy / ch
    uvs[start+4] = (uvx + r.width) / cw
    uvs[start+5] = 1.0 - (uvy + r.height) / ch
    uvs[start+6] = uvx / cw
    uvs[start+7] = 1.0 - (uvy + r.height) / ch
    var text = labels[r.i].text
    var x = r.x + pw*0.5
    var y = result.height - r.y - ph*0.5
    this._ctx.strokeText(text, x, y)
    this._ctx.fillText(text, x, y)
  }
  if (!this._texture) {
    this._texture = map.regl.texture(this._canvas)
  } else {
    this._texture(this._canvas)
  }
  this._props.positions = this._labelEngine.data.positions
  this._props.uvs = uvs
  this._props.texture = this._texture
  this._props.cells = this._labelEngine.data.cells
  this._props.cell_count = this._labelEngine.count.cells
  return this._props
}

Text.prototype._setFont = function () {
  this._ctx.font = this._font
  this._ctx.fillStyle = this._fillStyle
  this._ctx.lineWidth = this._lineWidth
  this._ctx.strokeStyle = this._strokeStyle
}

Text.prototype._addPoint = function (map, labels, p, pw, ph) {
  if (!p || !p.positions) return
  for (var ix = 0; ix < p.id.length; ix++) {
    var id = p.id[ix]
    if (!p.labels.hasOwnProperty(id) || p.labels[id].length === 0) continue
    var text = this._getLabel(p.labels[id])
    var lon = p.positions[ix*2+0]
    var lat = p.positions[ix*2+1]
    if (map.viewbox[0] > lon || lon > map.viewbox[2]) continue
    if (map.viewbox[1] > lat || lat > map.viewbox[3]) continue
    var pxToLon = (map.viewbox[2]-map.viewbox[0]) / map._size[0]
    var pxToLat = (map.viewbox[3]-map.viewbox[1]) / map._size[1]
    var m = this._ctx.measureText(text)
    var widthPx = Math.ceil(m.actualBoundingBoxRight - m.actualBoundingBoxLeft)
    var heightPx = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    var widthLon = (widthPx + pw + 1) * pxToLon
    var heightLat = (heightPx + ph + 1) * pxToLat
    labels.push({
      type: 'point',
      point: [lon,lat],
      labelSize: [widthLon,heightLat],
      labelMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      pointSize: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      pointMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      widthPx,
      heightPx,
      text,
    })
  }
}

Text.prototype._addLine = function (map, labels, l) {
  var ph = 4, pw = 4
  if (!l || !l.positions) return
  var start = 0, prev = null
  for (var ix = 0; ix < l.id.length; ix++) {
    var id = l.id[ix]
    if ((prev === null || prev === id) && ix !== l.id.length-1) {
      prev = id
      continue
    }
    if (!l.labels.hasOwnProperty(id) || l.labels[id].length === 0) {
      start = ix
      continue
    }
    var text = this._getLabel(l.labels[prev])
    prev = id
    if (text === null) continue
    var end = ix
    var vb = map.viewbox
    var positions = l.positions.slice(start*2,end*2+2) // todo: subarray
    start = ix
    var pxToLon = (map.viewbox[2]-map.viewbox[0]) / map._size[0]
    var pxToLat = (map.viewbox[3]-map.viewbox[1]) / map._size[1]
    var m = this._ctx.measureText(text)
    var widthPx = Math.ceil(m.actualBoundingBoxRight - m.actualBoundingBoxLeft)
    var heightPx = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    var widthLon = (widthPx + pw + 1) * pxToLon
    var heightLat = (heightPx + ph + 1) * pxToLat
    labels.push({
      type: 'line',
      positions,
      labelSize: [widthLon,heightLat],
      labelMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      lineSize: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      lineMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      widthPx,
      heightPx,
      text,
    })
  }
}

Text.prototype._addArea = function (map, labels, l) {
  var ph = 4, pw = 4
  if (!l || !l.positions) return
  var start = 0, prev = null
  for (var ix = 0; ix < l.id.length; ix++) {
    var id = l.id[ix]
    if ((prev === null || prev === id) && ix !== l.id.length-1) {
      prev = id
      continue
    }
    if (!l.labels.hasOwnProperty(id) || l.labels[id].length === 0) {
      start = ix
      prev = id
      continue
    }
    var labelId = prev
    var text = this._getLabel(l.labels[prev])
    prev = id
    if (text === null) continue
    var end = ix
    var vb = map.viewbox
    var positions = l.positions.slice(start*2,end*2+2) // todo: subarray
    start = ix
    var pxToLon = (map.viewbox[2]-map.viewbox[0]) / map._size[0]
    var pxToLat = (map.viewbox[3]-map.viewbox[1]) / map._size[1]
    var m = this._ctx.measureText(text)
    var widthPx = Math.ceil(m.actualBoundingBoxRight - m.actualBoundingBoxLeft)
    var heightPx = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    var widthLon = (widthPx + pw + 1) * pxToLon
    var heightLat = (heightPx + ph + 1) * pxToLat
    labels.push({
      type: 'area',
      positions,
      labelSize: [widthLon,heightLat],
      labelMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      widthPx,
      heightPx,
      text,
    })
  }
}

Text.prototype._getLabel = function (labels) {
  if (!labels) return null
  var best = 0, btext = null
  for (var i = 0; i < labels.length; i++) {
    var m = /^([^=]*)=(.*)/.exec(labels[i])
    if (!m) continue
    var lang = m[1], text = m[2]
    var score = 1
    if (lang === 'en') score += 3 // todo
    else if (lang === '') score += 2
    else if (lang === 'alt') score += 1
    if (score > best) {
      best = score
      btext = text
    }
  }
  return btext
}
