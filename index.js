var glsl = require('glslify')
var featureList = require('./features.json')

var size = new Float32Array(2)
var lw

var pointStyleData = new Float32Array(4*Object.keys(featureList).length)
for (var x = 0; x < pointStyleData.length; x += 4) {
  pointStyleData[x+0] = 2 //r
  pointStyleData[x+1] = 0 //g
  pointStyleData[x+2] = 0 //b
  pointStyleData[x+3] = 0 //a
}
pointStyleData[featureList['amenity.cafe']*4+0] = 20 //sets r to 20 for cafe

module.exports = function (map) {
  return {
    points: {
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
    },
    lines: {
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
    },
    areas: {}
  }
}
//each point (including all points in a way) need to have attribute 'type' that
//is pulled from the osm tags and corresponds to the items in features.json

//texture should be 1 pixel high. each pixel should have a 4 item array with the
//values that will correspond with rgba channels.
//    texture2D(texture, vec2()
//    texture: featuresTex
