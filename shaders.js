var glsl = require('glslify')
var size = [0,0]

module.exports = function (map) {
  var styleTextureCache = {}
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
          //vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          vec3 c = vec3(d.x, d.y, d.z);
          gl_FragColor = vec4(c, 1.0);
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
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec2 p = position.xy + offset;
          vec4 d = texture2D(styleTexture, uv);
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            0, 1);
          gl_PointSize = d.w;
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
        styleTexture: styleTexture('points'),
        featureCount: map.prop('styleCount')
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
    lineStroke: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying float vfeatureType;
        uniform float featureCount, styleTextureWidth, styleTextureHeight;
        uniform vec2 size;
        varying vec2 vdist;
        varying vec4 d0, d1, d2;
        void main () {
          float d = length(vdist)*20.0*d2.z;
          float gl = d2.z;
          if (d0.x < 0.1) discard;
          //gl_FragColor = vec4(d1.xyz, 1);
          gl_FragColor = vec4(step(gl, mod(d, d1.x)), d1.y, d1.z, 1);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position, normal, dist;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, styleTextureHeight, styleTextureWidth, zindex;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 d0, d1, d2;
        void main () {
          vfeatureType = featureType;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            0.0/styleTextureHeight + 0.3/styleTextureHeight
          ));
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            1.0/styleTextureHeight + 0.3/styleTextureHeight
          ));
          d2 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            2.0/styleTextureHeight + 0.3/styleTextureHeight
          ));
          vec2 p = position.xy + offset;
          vec2 n = (d0.w+2.0*d1.w)/size;
          vnorm = normalize(normal)*n;
          vdist = vec2(
            (dist.x / (viewbox.z - viewbox.x) * 2.0 - 1.0) * aspect,
            (dist.y / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect
          );
          //float pw = d0.w;
          //vec2 n = pw/size;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          vpos = gl_Position.xy;
          gl_Position += vec4(vnorm, 0, 0);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTextureWidth: map.prop('styleCount'),
        styleTextureHeight: map.prop('texHeight'),
        styleTexture: styleTexture('lineStroke'),
        featureCount: map.prop('styleCount'),
        zindex: map.prop('zindex')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        normal: map.prop('normals'),
        dist: map.prop('distances')
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
    lineFill: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying float vfeatureType;
        uniform float featureCount, styleTextureWidth, styleTextureHeight;
        uniform vec2 size;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 d0, d1, d2;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          //float d = max(vdist.x, vdist.y)*20.0;
          float d = length(vdist)*20.0*d2.x;
          float gl = d2.y;
          if (d0.x < 0.1) discard;
          //gl_FragColor = vec4(d0.xyz, 1);
          //gl_FragColor = vec4(step(0.5, mod(d, 1.0)), 0, 0, 1);
          gl_FragColor = vec4(step(gl, mod(d, d0.x)), d0.y, d0.z, 1);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position, normal, dist;
        attribute float featureType;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float featureCount, aspect, styleTextureHeight, styleTextureWidth, zindex;
        uniform sampler2D styleTexture;
        varying float vfeatureType;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 d0, d1, d2;
        void main () {
          vfeatureType = featureType;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            0.0/styleTextureHeight + 0.3/styleTextureHeight
          ));
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            1.0/styleTextureHeight + 0.3/styleTextureHeight
          ));
          d2 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            2.0/styleTextureHeight + 0.3/styleTextureHeight
          ));
          vec2 p = position.xy + offset;
          vec2 n = d0.w/size;
          vnorm = normalize(normal)*n;
          //float pw = d0.w;
          //vec2 n = pw/size;
          vdist = vec2(
            (dist.x / (viewbox.z - viewbox.x) * 2.0 - 1.0) * aspect,
            (dist.y / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect
          );
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          vpos = gl_Position.xy;
          gl_Position += vec4(vnorm, 0, 0);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTextureWidth: map.prop('styleCount'),
        styleTextureHeight: map.prop('texHeight'),
        styleTexture: styleTexture('lineFill'),
        featureCount: map.prop('styleCount'),
        zindex: map.prop('zindex')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        normal: map.prop('normals'),
        dist: map.prop('distances')
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
        varying float vfeatureType;
        uniform float featureCount;
        uniform sampler2D styleTexture;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          vec2 uv = vec2(vfeatureType/(featureCount-1.0),0.5);
          vec4 d = texture2D(styleTexture, uv);
          //if (d.x < 0.1) discard;
          //vec3 c = hsl2rgb(0.0+d.y, 1.0, 0.5);
          gl_FragColor = vec4(d.xyz, 1.0);
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vid;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vid, 0.0, 0.0, 1.0);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType, id;
        uniform vec4 viewbox;
        uniform vec2 offset, size;
        uniform float aspect;
        varying float vfeatureType, vid;
        void main () {
          vec2 p = position.xy + offset;
          vfeatureType = featureType;
          vid = id;
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
        featureCount: map.prop('styleCount'),
        styleTexture: styleTexture('areas'),
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        id: map.prop('id')
      },
      elements: map.prop('cells'),
      primitive: "triangles",
      blend: {
        enable: true,
        func: { src: 'src alpha', dst: 'one minus src alpha' }
      }
    },
    labels: {
			frag: `
			precision mediump float;
			void main () {
				gl_FragColor = vec4(0,0,1,1);
			}`,
			vert: `
			precision mediump float;
			attribute vec2 position;
			void main () {
				gl_Position = vec4(position.xy*vec2(1,-1)*0.2, 0, 1);
			}`,
			attributes: {
				position: map.prop('positions')
      },
			elements: map.prop('cells'),
			depth: { enable: false }
    }
  }
  function styleTexture (name) {
    return function (context, props) {
      if (!styleTextureCache[name]) {
        styleTextureCache[name] = map.regl.texture({
          data: props.style,
          width: props.styleCount,
          height: props.texHeight
        })
      }
      return styleTextureCache[name]
    }
  }
}
