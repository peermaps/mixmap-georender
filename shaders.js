var glsl = require('glslify')
var size = [0,0]

module.exports = function (map) {
  return {
    points: {
      frag: glsl`
        precision highp float;
        uniform sampler2D texture, styleTexture;
        varying vec3 dd0;
        varying vec4 d0, d1;
        uniform float featureCount;
        void main () {
          if (d0.x < 0.1) discard;
          gl_FragColor = vec4(d0.xyz, 1.0);
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 0.0, 1.0);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texRange;
        uniform float featureCount, aspect, zoom, zoomStart, zoomCount;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex;
        varying vec4 d0, d1;
        void main () {
          vfeatureType = featureType;
          vindex = index;
          float n = 2.0;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (0.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * vec4(1,1,1,255);
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (1.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * 255.0;
          zindex = d1.y;
          vec2 p = position.xy + offset;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          gl_PointSize = d1.x;
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange'),
        featureCount: map.prop('styleCount')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes')
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
        uniform float featureCount;
        uniform vec2 size;
        varying vec2 vdist;
        varying vec4 d0, d1, d2, d3;
        void main () {
          float d = step(d2.w/100.0, mod(length(vdist)*20.0, d2.z/10.0));
          gl_FragColor = vec4(d1.xyz, min(d,step(0.1,d1.x)));
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 0.5, 1.0);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texRange;
        uniform float featureCount, aspect, zoom, zoomStart, zoomCount;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 d0, d1, d2, d3;
        void main () {
          vfeatureType = featureType;
          vindex = index;
          float n = 4.0;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (0.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * vec4(1,1,1,255);
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (1.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * vec4(1,1,1,255);
          d2 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (2.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * 255.0;
          d3 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (3.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * 255.0;
          zindex = d3.z;
          vec2 p = position.xy + offset;
          vec2 m = (d3.x+2.0*d3.y)/size;
          vnorm = normalize(normal)*m;
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
        styleTexture: map.prop('style'),
        featureCount: map.prop('styleCount'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes'),
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
        uniform float featureCount;
        uniform vec2 size;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 d0, d1, d2, d3;
        #pragma glslify: hsl2rgb = require('glsl-hsl2rgb')
        void main () {
          float d = step(d2.y/100.0, mod(length(vdist)*20.0, d2.x/10.0));
          gl_FragColor = vec4(d0.xyz, min(d,step(0.1,d0.x)));
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 0.5, 1.0);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texRange;
        uniform float featureCount, aspect, zoom, zoomStart, zoomCount;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 d0, d1, d2, d3;
        void main () {
          vfeatureType = featureType;
          vindex = index;
          float n = 4.0;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (0.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * vec4(1,1,1,255);
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (1.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * vec4(1,1,1,255);
          d2 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (2.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * 255.0;
          d3 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (3.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * 255.0;
          zindex = d3.z + 0.1;
          vec2 p = position.xy + offset;
          vnorm = normalize(normal)*(d3.x/size);
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
        styleTexture: map.prop('style'),
        featureCount: map.prop('styleCount'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes'),
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
        varying vec4 d0;
        void main () {
          gl_FragColor = vec4(d0.xyz, 1.0);
        }
      `,
      pickFrag: `
        precision highp float;
        varying float vfeatureType, vindex;
        uniform float featureCount;
        void main () {
          gl_FragColor = vec4(vindex, vfeatureType, 1.0, 1.0);
        }
      `,
      vert: `
        precision highp float;
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texRange;
        uniform float aspect, featureCount, zoom, zoomStart, zoomCount;
        uniform sampler2D styleTexture;
        varying float vfeatureType, vindex, zindex;
        varying vec4 d0, d1;
        void main () {
          vfeatureType = featureType;
          vindex = index;
          float n = 2.0;
          d0 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (0.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          ));
          d1 = texture2D(styleTexture, vec2(
            vfeatureType/featureCount+0.5/featureCount,
            ((floor(zoom)-zoomStart)/zoomCount + (1.0*2.0+1.0)/(n*zoomCount*2.0))
              * (texRange.y-texRange.x) + texRange.x
          )) * 255.0;
          zindex = d1.x;
          vec2 p = position.xy + offset;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        featureCount: map.prop('styleCount'),
        styleTexture: map.prop('style'),
        zoomStart: map.prop('zoomStart'),
        zoomCount: map.prop('zoomCount'),
        texRange: map.prop('texRange')
      },
      attributes: {
        position: map.prop('positions'),
        featureType: map.prop('types'),
        index: map.prop('indexes')
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
}
