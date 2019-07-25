var mixmap = require('mixmap')
var regl = require('regl')
var glsl = require('glslify')
var resl = require('resl')
var featureList = require('./features.json')
 
var mix = mixmap(regl, { extensions: ['oes_element_index_uint', 'oes_texture_float'] })
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
var lw

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
    position: map.prop('positions'),
    normal: map.prop('normals')
  },
  primitive: "triangle strip",
  count: function (context, props) {
    return props.positions.length
  },
  blend: {
    enable: true,
    func: { src: 'src alpha', dst: 'one minus src alpha' }
  }
})

var pointStyleData = new Float32Array(4*Object.keys(featureList).length)
for (var x = 0; x < pointStyleData.length; x += 4) {
  pointStyleData[x+0] = 2 //r
  pointStyleData[x+1] = 0 //g
  pointStyleData[x+2] = 0 //b
  pointStyleData[x+3] = 0 //a
}
pointStyleData[featureList['amenity.cafe']*4+0] = 20 //sets r to 20 for cafe

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
    attribute float featureType;
    uniform vec4 viewbox;
    uniform vec2 offset, size;
    uniform float pointSize, featureCount;
    uniform sampler2D styleTexture;
    void main () {
      vec2 uv = vec2(featureType/(featureCount-1.0),0.5);
      vec2 p = position.xy + offset;
      vec4 c = texture2D(styleTexture, uv);
      gl_Position = vec4(
        (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
        (p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0,
        0, 1);
      gl_PointSize = c.x;
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
    },
    styleTexture: function () {
      return map.regl.texture({
        data: pointStyleData,
        width: pointStyleData.length/4,
        height: 1
      })
    },
    featureCount: Object.keys(featureList).length
  },
  attributes: {
    position: map.prop('positions'),
    featureType: map.prop('types')
  },
  primitive: "points",
  count: function (context, props) {
    return props.positions.length
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
      positions: assets.lines.positions,
      normals: assets.lines.normals
    })
    drawPoints.props.push({
      positions: assets.points.positions,
      types: assets.points.types
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
