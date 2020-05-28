var glsl = require('glslify')
var featureList = require('./features.json')

var size = new Float32Array(2)
var lw

var pointStyleData = new Float32Array(4*Object.keys(featureList).length)
for (var x = 0; x < pointStyleData.length; x += 4) {
  pointStyleData[x+0] = 1 //r
  pointStyleData[x+1] = 0 //g
  pointStyleData[x+2] = 0 //b
  pointStyleData[x+3] = 0 //a
}
pointStyleData[featureList['amenity.cafe']*4+0] = 20 //sets r to 20 for cafe
pointStyleData[featureList['amenity.cafe']*4+1] = 0.2

var lineStyleData = new Float32Array(4*Object.keys(featureList).length)
for (var x = 0; x < lineStyleData.length; x += 4) {
  lineStyleData[x+0] = 2 //r
  lineStyleData[x+1] = 0.5 //g
  lineStyleData[x+2] = 0.2 //b
  lineStyleData[x+3] = 0 //a
}
lineStyleData[featureList['highway.residential']*4+2] = 0

var areaStyleData = new Float32Array(4*Object.keys(featureList).length)
for (var x = 0; x < areaStyleData.length; x += 4) {
  areaStyleData[x+0] = 0 //r
  areaStyleData[x+1] = 0 //g
  areaStyleData[x+2] = 0 //b
  areaStyleData[x+3] = 0 //a
}
//areaStyleData[featureList['place.other']*4+0] = 0.5 //sets r to 0.5
areaStyleData[221*4+0] = 0.5 //sets r
areaStyleData[226*4+1] = 0.2 //sets g
areaStyleData[226*4+0] = 0.5 //sets r

module.exports = function (map) {
  return {
    points: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying float vfeatureType;
        uniform float featureCount;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec4 d = texture2D(styleTexture, uv);
          if (d.x < 0.1) discard;
          vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          gl_FragColor = vec4(c,d.x+0.3);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float pointSize, featureCount, aspect;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        void main () {
          vfeatureType = featureType;
          vec2 uv = vec2(featureType/(featureCount-1.0),0.5);
          vec2 p = position.xy + offset;
          vec4 c = texture2D(styleTexture, uv);
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
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
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    lines: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying float vfeatureType;
        uniform float featureCount;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec4 d = texture2D(styleTexture, uv);
          if (d.x < 0.1) discard;
          vec3 c = hsl2rgb(0.0+d.y, d.z + 0.1, 0.3);
          gl_FragColor = vec4(c,d.x+0.3);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position, normal;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float lineWidth, featureCount, aspect;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        void main () {
          vfeatureType = featureType;
          vec2 uv = vec2(featureType/(featureCount-1.0),0.5);
          vec4 c = texture2D(styleTexture, uv);
          vec2 p = position.xy + offset + normal*(c.y*lineWidth*(viewbox.z - viewbox.x)/size.x);
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
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
          else lw = 0.8 
          console.log(map.getZoom())
          return lw
        },
        styleTexture: function () {
          return map.regl.texture({
            data: lineStyleData,
            width: lineStyleData.length/4,
            height: 1
          })
        },
        featureCount: Object.keys(featureList).length
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        normal: map.prop('normals')
      },
      primitive: "triangle strip",
      count: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    areas: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture;
        varying float vfeatureType;
        uniform float featureCount;
        uniform sampler2D styleTexture;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec4 d = texture2D(styleTexture, uv);
          if (d.x < 0.1) discard;
          vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          gl_FragColor = vec4(c,d.x+0.3);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        void main () {
          vec2 p = position.xy + offset;
          vfeatureType = featureType;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            0, 1);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: function () {
          return map.regl.texture({
            data: areaStyleData,
            width: areaStyleData.length/4,
            height: 1
          })
        },
        featureCount: Object.keys(featureList).length
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types')
      },
      elements: map.prop('cells'),
      primitive: "triangles",
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    }
  }
}

//texture should be 1 pixel high. each pixel should have a 4 item array with the
//values that will correspond with rgba channels.
//    texture2D(texture, vec2()
//    texture: featuresTex
