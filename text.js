var QBZF = require('qbzf')
var Atlas = require('qbzf/atlas')
var LabelEngine = require('label-placement-engine')
var labelPreset = {
  bbox: require('label-placement-engine/preset/bbox'),
  point: require('label-placement-engine/preset/point'),
  line: require('label-placement-engine/preset/line'),
  area: require('label-placement-engine/preset/area'),
}
var labelTypes = {
  pointP: 'point',
  pointT: 'point',
  lineP: 'line',
  lineT: 'line',
  areaP: 'bbox',
  areaT: 'bbox',
}
var uvs = [0,0, 1,0, 1,1, 0,1]
var padding = [10,10]

module.exports = Text

function Text(opts) {
  if (!opts) opts = {}
  if (!(this instanceof Text)) return new Text(opts)
  this._qbzf = QBZF(opts.font)
  this._atlas = Atlas(this._qbzf, {
    attributes: ['fillColor','strokeColor']
  })
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
  var viewboxWidthLon = map.viewbox[2] - map.viewbox[0]
  var viewboxHeightLat = map.viewbox[3] - map.viewbox[1]
  var labels = []
  labels.push({ type: 'bbox', bounds: map.viewbox })
  var ph = 4, pw = 4
  this._addPoint(map, labels, props.pointT, pw, ph)
  this._addPoint(map, labels, props.pointP, pw, ph)
  //this._addLine(map, labels, props.lineT, pw, ph)
  //this._addLine(map, labels, props.lineP, pw, ph)
  //this._addArea(map, labels, props.areaT, pw, ph)
  //this._addArea(map, labels, props.areaP, pw, ph)
  this._labelEngine.update(labels)
  this._atlas.clear()
  var ilabels = {}, idLabels = {}
  for (var i = 0; i < labels.length; i++) {
    if (!this._labelEngine.isVisible(i)) continue
    var l = labels[i]
    if (l.type !== 'point' && l.type !== 'line' && l.type !== 'area') continue
    idLabels[l.id] = l
    ilabels[l.id] = i
    this._atlas.add({
      id: l.id,
      text: l.text,
      height: l.heightPx,
      fillColor: [0,0,0],
      strokeColor: [1,1,1],
      strokeWidth: 150,
      padding,
    })
  }

  var data = this._atlas.build()
  var ns = Object.keys(data)
  this._props = {}
  var positionMap = new Uint32Array(this._labelEngine.data.positions.length)
  for (var i = 0; i < ns.length; i++) {
    var n = ns[i]
    var d = data[n]
    if (!d) continue
    var psize = 0
    for (var j = 0; j < d.ids.length; j++) {
      var id = d.ids[j]
      var l = idLabels[id]
      var ix = ilabels[id]
      var pstart = this._labelEngine.offsets.positions[ix*2+0]
      var pend = this._labelEngine.offsets.positions[ix*2+1]
      psize += pend-pstart
    }
    var props = {
      positions: new Float32Array(psize),
      uvs: new Float32Array(psize),
      cells: null,
      offsets: new Float32Array(psize/2),
      units: new Float32Array(psize),
      size: new Float32Array(psize),
      fillColors: new Float32Array(psize/2*3),
      strokeWidths: new Float32Array(psize/2),
      strokeColors: new Float32Array(psize/2*3),
      curves: d.curves,
      grid: d.grid,
    }
    this._props[n] = props
    if (!d.curves.texture) d.curves.texture = map.regl.texture(d.curves)
    if (!d.grid.texture) d.grid.texture = map.regl.texture(d.grid)
    var pindex = 0
    for (var j = 0; j < d.ids.length; j++) {
      var id = d.ids[j]
      var l = idLabels[id]
      var ix = ilabels[id]
      var pstart = this._labelEngine.offsets.positions[ix*2+0]/2
      var pend = this._labelEngine.offsets.positions[ix*2+1]/2
      for (var k = 0; k < pend-pstart; k++) {
        props.positions[pindex*2+0] = this._labelEngine.data.positions[(pstart+k)*2+0]
        props.positions[pindex*2+1] = this._labelEngine.data.positions[(pstart+k)*2+1]
        positionMap[(pstart+k)*2+0] = Number(n)
        positionMap[(pstart+k)*2+1] = pindex
        props.uvs[pindex*2+0] = uvs[k*2+0]
        props.uvs[pindex*2+1] = uvs[k*2+1]
        props.offsets[pindex] = d.offsets[j*4]
        props.units[pindex*2+0] = d.units[j*4][0]
        props.units[pindex*2+1] = d.units[j*4][1]
        props.size[pindex*2+0] = d.size[j*4][0]
        props.size[pindex*2+1] = d.size[j*4][1]
        props.fillColors[pindex*3+0] = d.fillColor[j*4][0]
        props.fillColors[pindex*3+1] = d.fillColor[j*4][1]
        props.fillColors[pindex*3+2] = d.fillColor[j*4][2]
        props.strokeWidths[pindex] = d.strokeWidth[j*4]
        props.strokeColors[pindex*3+0] = d.strokeColor[j*4][0]
        props.strokeColors[pindex*3+1] = d.strokeColor[j*4][1]
        props.strokeColors[pindex*3+2] = d.strokeColor[j*4][2]
        pindex++
      }
    }
  }
  var cindex = {}, csize = {}
  for (var i = 0; i < this._labelEngine.data.cells.length; i++) {
    var c = this._labelEngine.data.cells[i]
    var n = positionMap[c*2+0]
    if (csize[n] === undefined) csize[n] = 1
    else csize[n]++
  }
  for (var i = 0; i < ns.length; i++) {
    var n = Number(ns[i])
    if (!this._props[n]) continue
    this._props[n].cells = new Uint32Array(csize[n])
  }
  for (var i = 0; i < this._labelEngine.data.cells.length; i++) {
    var c = this._labelEngine.data.cells[i]
    var n = positionMap[c*2+0], j = positionMap[c*2+1]
    if (!this._props[n]) continue
    if (n === 0) continue
    if (cindex[n] === undefined) cindex[n] = 0
    this._props[n].cells[cindex[n]++] = j
  }
  return this._props
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
    var m = this._qbzf.measure({
      text,
      strokeWidth: 150,
      padding,
    })
    var fontSize = 12
    var widthPx = Math.round(m.units[0]/this._qbzf.unitsPerEm*fontSize)
    var heightPx = Math.round(m.units[1]/this._qbzf.unitsPerEm*fontSize)
    var widthLon = (widthPx + pw + 1) * pxToLon
    var heightLat = (heightPx + ph + 1) * pxToLat
    labels.push({
      type: 'point',
      point: [lon,lat],
      labelSize: [widthLon,heightLat],
      labelMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      pointSize: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      pointMargin: [10/map._size[0]*widthLon,10/map._size[1]*heightLat],
      id,
      widthPx,
      heightPx,
      text,
    })
  }
}

Text.prototype._addLine = function (map, labels, l) {
  return
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
    /*
    var m = this._ctx.measureText(text)
    var widthPx = Math.ceil(m.actualBoundingBoxRight - m.actualBoundingBoxLeft)
    var heightPx = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    */
    var widthPx = 100
    var heightPx = 15
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
  return
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
    /*
    var m = this._ctx.measureText(text)
    var widthPx = Math.ceil(m.actualBoundingBoxRight - m.actualBoundingBoxLeft)
    var heightPx = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    */
    var widthPx = 100
    var heightPx = 15
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
