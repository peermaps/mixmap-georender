var mixmap = require('mixmap')
var regl = require('regl')
var glsl = require('glslify')
var resl = require('resl')
 
var mix = mixmap(regl, { extensions: ['oes_element_index_uint'] })
var map = mix.create({ viewbox: [+36.1, +49.9, +36.3, +50.1]})
 
var drawTile = map.createDraw({
  frag: glsl`
    precision highp float;
    #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
    uniform float id;
    uniform sampler2D texture;
    varying vec2 vtcoord;
    void main () {
      float h = mod(id/8.0,1.0);
      float s = mod(id/4.0,1.0)*0.5+0.25;
      float l = mod(id/16.0,1.0)*0.5+0.25;
      vec3 c = hsl2rgb(h,s,l);
      vec4 tc = texture2D(texture,vtcoord);
      gl_FragColor = vec4(c*(1.0-tc.a)+tc.rgb*tc.a,0.5+tc.a*0.5);
    }
  `,
  vert: `
    precision highp float;
    attribute vec2 position;
    uniform vec4 viewbox;
    uniform vec2 offset;
    uniform float zindex;
    attribute vec2 tcoord;
    varying vec2 vtcoord;
    void main () {
      vec2 p = position + offset;
      vtcoord = tcoord;
      gl_Position = vec4(
        (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
        (p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0,
        1.0/(1.0+zindex), 1);
    }
  `,
  uniforms: {
    id: map.prop('id'),
    zindex: map.prop('zindex'),
    texture: map.prop('texture')
  },
  attributes: {
    position: map.prop('points'),
    tcoord: [0,1,0,0,1,1,1,0] // sw,se,nw,ne
  },
  elements: [0,1,2,1,2,3],
  blend: {
    enable: true,
    func: { src: 'src alpha', dst: 'one minus src alpha' }
  }
})
 
var manifest = require('./ne2srw/tiles.json')
var tiles = [ {}, {}, {} ]
manifest.forEach(function (file,id) {
  var level = Number(file.split('/')[0])
  var bbox = file.split('/')[1].replace(/\.jpg$/,'').split('x').map(Number)
  tiles[level][id+'!'+file] = bbox
})
 
map.addLayer({
  viewbox: function (bbox, zoom, cb) {
    zoom = Math.round(zoom)
    if (zoom < 2) cb(null, tiles[0])
    else if (zoom < 4) cb(null, tiles[1])
    else cb(null, tiles[2])
  },
  add: function (key, bbox) {
    var file = key.split('!')[1]
    var level = Number(file.split('/')[0])
    var prop = {
      id: Number(key.split('!')[0]),
      key: key,
      zindex: 2 + level,
      texture: map.regl.texture(),
      points: [
        bbox[0], bbox[1], // sw
        bbox[0], bbox[3], // se
        bbox[2], bbox[1], // nw
        bbox[2], bbox[3]  // ne
      ]
    }
    drawTile.props.push(prop)
    map.draw()
    resl({
      manifest: { tile: { type: 'image', src: 'ne2srw/'+file } },
      onDone: function (assets) {
        prop.texture = map.regl.texture(assets.tile)
        map.draw()
      }
    })
  },
  remove: function (key, bbox) {
    drawTile.props = drawTile.props.filter(function (p) {
      return p.key !== key
    })
  }
})

var size = new Float32Array(2)
var texArray = new Float32Array(497*4)
var lw

for (var i = 0; i <= texArray.length; i+=4) {
  if (i % 10 === 0) {
    texArray[i] = 20
    texArray[i+1] = 0
    texArray[i+2] = 0
    texArray[i+3] = 0

  }
  else
    texArray[i] = 10
    texArray[i+1] = 0
    texArray[i+2] = 0
    texArray[i+3] = 0
}
console.log(texArray)
/*
var featuresTex = regl.texture({
  width: texArray.length,
  height: 1,
  data: texArray 
})
*/

var drawLines = map.createDraw({
  frag: glsl`
    precision highp float;
    uniform sampler2D texture;
    #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
    void main () {
      vec3 c = hsl2rgb(0.5, 0.5, 0.2);
      gl_FragColor = vec4(c,0.9);
    }
  `,
  vert: `
    precision highp float;
    attribute vec2 position, normal;
    uniform vec4 viewbox;
    uniform vec2 offset, size;
    uniform float lineWidth;
    void main () {
      vec2 p = position.xy + offset + normal*(lineWidth*(viewbox.z - viewbox.x)/size.x);
      gl_Position = vec4(
        (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
        (p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0,
        0, 1);
    }
  `,
  uniforms: {
    size: function (context) {
      size[0] = context.viewportWidth
      size[1] = context.viewportHeight
      return size
    },
    lineWidth: function () {
      if (map.getZoom() <= 13) { lw = 0.5 }      
      else if (map.getZoom() >= 16) { lw = 2.0 }      
      else lw = 1.0
      console.log(map.getZoom())
      return lw
    }
  },
  attributes: {
    position: map.prop('position'),
    normal: map.prop('normal')
  },
  primitive: "triangle strip",
  count: function (context, props) {
    return props.position.length
  },
  blend: {
    enable: true,
    func: { src: 'src alpha', dst: 'one minus src alpha' }
  }
})

var drawPoints = map.createDraw({
  frag: glsl`
    precision highp float;
    uniform sampler2D texture;
    #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
    void main () {
      vec3 c = hsl2rgb(0.0, 0.5, 0.5);
      gl_FragColor = vec4(c,0.9);
    }
  `,
  vert: `
    precision highp float;
    attribute vec2 position;
    uniform vec4 viewbox;
    uniform vec2 offset, size;
    uniform float pointSize;
    void main () {
      vec2 p = position.xy + offset;
      gl_Position = vec4(
        (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
        (p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0,
        0, 1);
      gl_PointSize = pointSize;
    }
  `,
  uniforms: {
    size: function (context) {
      size[0] = context.viewportWidth
      size[1] = context.viewportHeight
      return size
    },
    pointSize: function () {
      if (map.getZoom() <= 13) { pw = 3.0 }      
      else if (map.getZoom() >= 16) { pw = 4.0 }
      else pw = 3.5
      return pw
    }
  },
  attributes: {
    position: map.prop('position')
  },
  primitive: "points",
  count: function (context, props) {
    return props.position.length
  },
  blend: {
    enable: true,
    func: { src: 'src alpha', dst: 'one minus src alpha' }
  }
})

resl({
  manifest: {
    lines: { type: 'text', src: 'tmesh4.json', parser: JSON.parse },
    points: { type: 'text', src: 'nodesonly.json', parser: JSON.parse }
  },
  onDone: function (assets) {
    drawLines.props.push({
      position: assets.lines.positions,
      normal: assets.lines.normals
    })
    drawPoints.props.push({
      position: assets.points.positions
    })
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
 
document.body.appendChild(mix.render())
document.body.appendChild(map.render({ width: 600, height: 400 }))
//each point (including all points in a way) need to have attribute 'type' that
//is pulled from the osm tags and corresponds to the items in features.json

//texture should be 1 pixel high. each pixel should have a 4 item array with the
//values that will correspond with rgba channels.
//    texture2D(texture, vec2()
//    texture: featuresTex
