var mixmap = require('mixmap')
var regl = require('regl')
var prepare = require('../prepare.js')
var decode = require('georender-pack/decode')
var lpb = require('length-prefixed-buffers')
 
var mix = mixmap(regl, { extensions: [
  'oes_element_index_uint', 'oes_texture_float', 'EXT_float_blend' ] })
var map = mix.create({ 
  viewbox: [+36.2146, +49.9962, +36.2404, +50.0154],
  backgroundColor: [0.82, 0.85, 0.99, 1.0],
  pickfb: { colorFormat: 'rgba', colorType: 'float32' }
})
var geoRender = require('../index.js')(map)
 
var draw = {
  area: map.createDraw(geoRender.areas),
  lineStroke: map.createDraw(geoRender.lineStroke),
  lineFill: map.createDraw(geoRender.lineFill),
  point: map.createDraw(geoRender.points),
}

var ready = function (props) {
  draw.point.props.push(props.point)
  draw.lineFill.props.push(props.lineFill)
  draw.lineStroke.props.push(props.lineStroke)
  draw.area.props.push(props.area)
  map.draw()
}

require('resl')({
  manifest: {
    texture: {
      type: 'image',
      src: './example/style.png',
      parser: function (data) { return map.regl.texture({ data }) }
    },
    buffers: {
      type: 'binary',
      src: './example/kharkiv',
      parser: function (data) { 
        return lpb.decode(Buffer.from(data))
      }
    }
  },
  onDone: function ({texture, buffers}) {
    ready(prepare(decode(buffers), texture))
  }
})

window.addEventListener('keydown', function (ev) {
  if (ev.code === 'Digit0') {
    map.setZoom(Math.min(6,Math.round(map.getZoom()+1)))
  } else if (ev.code === 'Minus') {
    map.setZoom(map.getZoom()-1)
  } else if (ev.code === 'Equal') {
    map.setZoom(map.getZoom()+1)
  }
})

window.addEventListener('resize', function (ev) {
  map.resize(window.innerWidth, window.innerHeight)
})
 
document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: window.innerWidth, height: window.innerHeight }))
