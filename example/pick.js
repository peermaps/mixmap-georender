var mixmap = require('mixmap')
var regl = require('regl')
var prepare = require('../prepare.js')
var getImagePixels = require('get-image-pixels')
var decode = require('georender-pack/decode')
var lpb = require('length-prefixed-buffers/without-count')
var Text = require('../text.js')
 
var mix = mixmap(regl, { extensions: [
  'oes_element_index_uint', 'oes_texture_float', 'EXT_float_blend', 'angle_instanced_arrays'] })
var map = mix.create({ 
  viewbox: [+36.2146, +49.9962, +36.2404, +50.0154],
  //viewbox: [+29.9, +31.1, +30.1, +31.3],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba', colorType: 'float32' }
})
window.map = map
var geoRender = require('../index.js')(map)

var draw = {
  area: map.createDraw(geoRender.areas),
  areaT: map.createDraw(geoRender.areas),
  areaBorder: map.createDraw(geoRender.areaBorders),
  areaBorderT: map.createDraw(geoRender.areaBorders),
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  lineStrokeT: map.createDraw(geoRender.lineStroke),
  lineFillT: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
  pointT: map.createDraw(geoRender.points),
  label: map.createDraw(geoRender.labels),
}
window.draw = draw

function ready({style, decoded}) {
  var prep = prepare({
    stylePixels: getImagePixels(style),
    styleTexture: map.regl.texture(style),
    zoomStart: 1,
    zoomEnd: 21,
    decoded
  })
  var zoom = Math.round(map.getZoom())
  var props = null
  var text = new Text
  update(zoom)
  map.on('viewbox', function () {
    var z = Math.round(map.getZoom())
    if (zoom !== z) {
      update(z)
    } else {
      //draw.label.props = [text.update(props, map)]
    }
    zoom = z
  })
  function update(zoom) {
    props = prep.update(zoom)
    draw.point.props = [props.pointP]
    draw.pointT.props = [props.pointT]
    draw.lineFill.props = [props.lineP]
    draw.lineStroke.props = [props.lineP]
    draw.lineFillT.props = [props.lineT]
    draw.lineStrokeT.props = [props.lineT]
    draw.area.props = [props.areaP]
    draw.areaT.props = [props.areaT]
    draw.areaBorder.props = [props.areaBorderP]
    draw.areaBorderT.props = [props.areaBorderT]
    //draw.label.props = [text.update(props, map)]
    map.draw()
  }
  window.addEventListener('click', function (ev) {
    console.log(ev.offsetX, ev.offsetY)
    map.pick({ x: ev.offsetX, y: ev.offsetY }, function (err, data) {
      if (data[2] === 0.0) {
        console.log(data[1], props.pointT.indexToId[data[0]])
      }
      else if (data[2] === 1.0) {
        console.log(data[1], props.pointP.indexToId[data[0]])
      }
      else if (data[2] === 2.0) {
        console.log(data[1], props.lineT.indexToId[data[0]])
      }
      else if (data[2] === 3.0) {
        console.log(data[1], props.lineP.indexToId[data[0]])
      }
      else if (data[2] === 4.0) {
        console.log(data[1], props.areaT.indexToId[data[0]])
      }
      else if (data[2] === 5.0) {
        console.log(data[1], props.areaP.indexToId[data[0]])
      }
    })
  })
}


require('resl')({
  manifest: {
    style: {
      type: 'image',
      src: './example/style.png'
    },
    decoded: {
      type: 'binary',
      src: './example/kharkiv' || location.search.slice(1),
      //src: './example/alexandria' || location.search.slice(1),
      parser: data => decode(lpb.decode(Buffer.from(data)))
    }
  },
  onDone: ready
})

window.addEventListener('resize', function (ev) {
  map.resize(window.innerWidth, window.innerHeight)
})

window.addEventListener('keydown', function (ev) {
  if (ev.code === 'Digit0') {
    map.setZoom(Math.min(6,Math.round(map.getZoom()+1)))
  } else if (ev.code === 'Minus') {
    map.setZoom(map.getZoom()-1)
    console.log(map.getZoom())
  } else if (ev.code === 'Equal') {
    map.setZoom(map.getZoom()+1)
    console.log(map.getZoom())
  }
})

document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: window.innerWidth, height: window.innerHeight }))
