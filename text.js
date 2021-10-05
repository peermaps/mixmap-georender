var binPack = require('bin-pack')
var labelMaker = require('label-maker')
var labelPreset = {
  bbox: require('label-maker/preset/bbox'),
  point: require('label-maker/preset/point'),
  line: require('label-maker/preset/line'),
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
  /*
  this._canvas = []
  this._ctx = []
  this._createCanvas = opts.createCanvas || opts.Canvas || function () {
    return document.createElement('canvas')
  }
  */
  this._canvas = opts.canvas || document.createElement('canvas')
  this._ctx = this._canvas.getContext('2d')
  this._scale = 
  this._labelEngine = labelMaker({
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
      var widthPx = m.actualBoundingBoxRight - m.actualBoundingBoxLeft
      var heightPx = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
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
    if (x.type === 'point' && this._labelEngine._visible[i] > 0.5) {
      bins.push({ i, width: x.widthPx, height: x.heightPx })
    }
  }

  var result = binPack(bins, { inPlace: true })
  this._canvas.width = Math.ceil(result.width)
  this._canvas.height = Math.ceil(result.height)
  this._setFont()
  var w = result.width - 1, h = result.height - 1
  for (var i = 0; i < bins.length; i++) {
    var r = bins[i]
    var start = this._labelEngine._offsets.positions[r.i*2+0]
    var end = this._labelEngine._offsets.positions[r.i*2+1]
    uvs[start+0] = r.x / w
    uvs[start+1] = 1.0 - r.y / h
    uvs[start+2] = (r.x + r.width) / w
    uvs[start+3] = 1.0 - r.y / h
    uvs[start+4] = (r.x + r.width) / w
    uvs[start+5] = 1.0 - (r.y + r.height) / h
    uvs[start+6] = r.x / w
    uvs[start+7] = 1.0 - (r.y + r.height) / h
    var text = labels[r.i].text
    var x = r.x
    var y = result.height - r.y - 2
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
  this._ctx.font = '14px helvetica, arial'
  this._ctx.fillStyle = 'black'
  this._ctx.lineWidth = 2
  this._ctx.strokeStyle = 'white'
}
