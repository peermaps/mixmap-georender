var binPack = require('bin-pack')
var LabelEngine = require('label-placement-engine')
var labelPreset = {
  bbox: require('label-placement-engine/preset/bbox'),
  point: require('label-placement-engine/preset/point'),
  line: require('label-placement-engine/preset/line'),
}
var labelTypes = {
  pointP: 'point',
  pointT: 'point',
  lineP: 'line',
  lineT: 'line',
  areaP: 'bbox',
  areaT: 'bbox',
}

module.exports = Text

function Text(opts) {
  if (!opts) opts = {}
  if (!(this instanceof Text)) return new Text(opts)

  this._font = opts.font || '14px helvetica, arial'
  this._fillStyle = 'black'
  this._lineWidth = 4
  this._strokeStyle = 'white'

  this._canvas = opts.canvas || document.createElement('canvas')
  this._ctx = this._canvas.getContext('2d')
  this._scale = 
  this._labelEngine = LabelEngine({
    types: {
      bbox: labelPreset.bbox(),
      point: labelPreset.point({
        labelMargin: [10,10],
        pointSize: [10,10],
        pointMargin: [10,10],
        pointSeparation: [10,10],
      }),
    }
  })
}

Text.prototype.update = function (props, map) {
  this._setFont()
  var viewboxWidthLon = map.viewbox[2] - map.viewbox[0]
  var viewboxHeightLat = map.viewbox[3] - map.viewbox[1]
  var labels = []
  labels.push({ type: 'bbox', bounds: map.viewbox })
  var ph = 4, pw = 4
  for (var key in props) {
    if (!props.hasOwnProperty(key)) continue
    var type = labelTypes[key]
    if (!/^point/.test(key)) continue
    var p = props[key]
    if (!p || !p.positions) continue
    for (var id in p.labels) {
      if (!p.labels.hasOwnProperty(id)) continue
      if (!p.labels[id] || p.labels[id].length === 0) continue
      // only the first one right now
      var text = p.labels[id][0].replace(/^[^=]*=/,'')
      var ix = p.idToIndex[id]
      if (ix === undefined) continue
      var lon = p.positions[ix*2+0]
      var lat = p.positions[ix*2+1]
      var pxToLon = (map.viewbox[2]-map.viewbox[0]) / map._size[0]
      var pxToLat = (map.viewbox[3]-map.viewbox[1]) / map._size[1]
      var lonPx = lon / (map.viewbox[2]-map.viewbox[0]) * map._size[0]
      var latPx = lat / (map.viewbox[3]-map.viewbox[1]) * map._size[1]
      var m = this._ctx.measureText(text)
      var widthPx = Math.ceil(m.actualBoundingBoxRight - m.actualBoundingBoxLeft) + pw
      var heightPx = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + ph
      var widthLon = widthPx * pxToLon
      var heightLat = heightPx * pxToLat
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
  this._labelEngine.update(labels)

  var uvs = new Float32Array(this._labelEngine.data.positions.length)
  this._labelEngine.data.uvs = uvs

  var bins = []
  for (var i = 0; i < labels.length; i++) {
    var x = labels[i]
    if (x.type === 'point' && this._labelEngine.visible[i] > 0.5) {
      bins.push({ i, width: x.widthPx, height: x.heightPx })
    }
  }

  var result = binPack(bins, { inPlace: true })
  this._canvas.width = Math.max(1, Math.ceil(result.width))
  this._canvas.height = Math.max(1, Math.ceil(result.height))
  this._setFont()
  var w = Math.ceil(result.width - 1), h = Math.ceil(result.height - 1)
  for (var i = 0; i < bins.length; i++) {
    var r = bins[i]
    var start = this._labelEngine.offsets.positions[r.i*2+0]
    var end = this._labelEngine.offsets.positions[r.i*2+1]
    var uvx = r.x - pw*0.5, uvy = r.y - ph*0.5
    uvs[start+0] = uvx / w
    uvs[start+1] = 1.0 - uvy / h
    uvs[start+2] = (uvx + r.width) / w
    uvs[start+3] = 1.0 - uvy / h
    uvs[start+4] = (uvx + r.width) / w
    uvs[start+5] = 1.0 - (uvy + r.height) / h
    uvs[start+6] = uvx / w
    uvs[start+7] = 1.0 - (uvy + r.height) / h
    var text = labels[r.i].text
    var x = r.x
    var y = result.height - r.y - ph*0.5
    this._ctx.strokeText(text, x, y)
    this._ctx.fillText(text, x, y)
  }
  this._labelEngine.data.texture = map.regl.texture(this._canvas)
  return {
    positions: this._labelEngine.data.positions,
    uvs: this._labelEngine.data.uvs,
    texture: this._labelEngine.data.texture,
    cells: this._labelEngine.data.cells,
    cell_count: this._labelEngine.count.cells,
  }
}

Text.prototype._setFont = function () {
  this._ctx.font = this._font
  this._ctx.fillStyle = this._fillStyle
  this._ctx.lineWidth = this._lineWidth
  this._ctx.strokeStyle = this._strokeStyle
}
