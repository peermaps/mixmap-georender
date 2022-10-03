var glsl = require('glslify')
var size = [0,0]

module.exports = function (map) {
  return {
    points: {
      frag: glsl`
        precision highp float;
        #pragma glslify: SpriteMeta = require('glsl-georender-style-texture/spritemeta.h');
        #pragma glslify: readSprite = require('glsl-georender-style-texture/readsprite.glsl');
        varying vec2 vuv;
        varying vec4 vcolor;
        varying float vsprite, vsmwidth, vsmheight, vsmx, vsmy, vsmtype;
        uniform sampler2D styleTexture;
        uniform vec2 texSize;
        void main () {
          SpriteMeta spriteMeta;
          spriteMeta.width = vsmwidth;
          spriteMeta.height = vsmheight;
          spriteMeta.x = vsmx;
          spriteMeta.y = vsmy;
          spriteMeta.type = vsmtype;
          gl_FragColor = mix(
            vec4(readSprite(styleTexture, texSize, spriteMeta, vuv).xyz, 1);
            vcolor,
            step(0.5, vsprite)
          );
          //gl_FragColor = vcolor;
        }
      `,
      pickFrag: `
        precision highp float;
        uniform vec2 size;
        varying float vft, vindex;
        varying vec2 vpos;
        varying vec4 vcolor;
        uniform float featureCount;
        void main () {
          float n = mod((vpos.x*0.5+0.5)*size.x, 2.0);
          vec4 pix1 = vec4(
            floor(vindex/(256.0*256.0)),
            mod(vindex/256.0, 256.0),
            mod(vindex, 256.0),
            255.0) / 255.0;
          float opacity = floor(min(vcolor.w, 1.0));
          //vec4 pix2 = vec4((0.0+opacity)/255.0, 0.0, 0.0, 1.0);
          vec4 pix2 = vec4(10.0/255.0, 0.0, 0.0, 1.0);
          gl_FragColor = mix(pix1, pix2, step(1.0, n));
          /*
          float opacity = floor(min(vcolor.w, 1.0));
          gl_FragColor = vec4(vindex, vft, opacity, 1.0);
          */
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Point = require('glsl-georender-style-texture/point.h');
        #pragma glslify: readPoint = require('glsl-georender-style-texture/point.glsl');
        #pragma glslify: SpriteMeta = require('glsl-georender-style-texture/spritemeta.h');
        #pragma glslify: readSpriteMeta = require('glsl-georender-style-texture/spritemeta.glsl');
        uniform sampler2D styleTexture;
        attribute vec2 position, ioffset, uv;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texSize;
        uniform float featureCount, aspect, zoom;
        varying float vft, vindex, zindex, vsprite, vsmwidth, vsmheight, vsmx, vsmy, vsmtype;
        varying vec2 vpos, vuv;
        varying vec4 vcolor;
        void main () {
          vft = featureType;
          Point point = readPoint(styleTexture, featureType, zoom, texSize);
          SpriteMeta spriteMeta = readSpriteMeta(styleTexture, texSize, point.sprite - 1.0);
          vsmwidth = spriteMeta.width;
          vsmheight = spriteMeta.height;
          vsmx = spriteMeta.x;
          vsmy = spriteMeta.y;
          vsmtype = spriteMeta.type;
          vsprite = point.sprite;
          vcolor = point.fillColor;
          vindex = index;
          vuv = uv;
          zindex = point.zindex;
          vec2 p = offset + ioffset;
          float psizex = 5.0 * point.size / size.x;
          float psizey = 5.0 * point.size / size.y;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1) + vec4(position.x * psizex, position.y * psizey, 0, 0);
          vpos = gl_Position.xy;
         }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        featureCount: map.prop('featureCount'),
        texSize: map.prop('imageSize'),
        aspect: function (context) {
          return context.viewportWidth / context.viewportHeight
        },
      },
      attributes: {
        position: [-1,1,1,1,1,-1,-1,-1],
        //uv: [0,0, 0,1, 1,1, 1,0],
        uv: [1,0, 0,0, 0,1, 1,1],
        ioffset: {
          buffer: map.prop('positions'),
          divisor: 1
        },
        featureType: {
          buffer: map.prop('types'),
          divisor: 1
        },
        index: {
          buffer: map.prop('indexes'),
          divisor: 1
        }
      },
      elements: [[0,1,2], [2,3,0]],
      primitive: "triangles",
      instances: function (context, props) {
        return props.positions.length/2
      },
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    lineStroke: {
      frag: glsl`
        precision highp float;
        uniform vec4 viewbox;
        uniform vec2 size;
        uniform float aspect;
        varying vec2 vdist;
        varying float vdashLength, vdashGap;
        varying vec4 vcolor;
        void main () {
          vec2 vb = vec2(viewbox.z-viewbox.x, viewbox.w-viewbox.y);
          vec2 s = vec2(size.x, size.y*aspect);
          float t = length(vdist*s/vb);
          float d = vdashLength;
          float g = vdashGap;
          float x = 1.0 - step(d, mod(t, d+g));
          gl_FragColor = vec4(vcolor.xyz, vcolor.w * x);
        }
      `,
      pickFrag: `
        precision highp float;
        uniform vec2 size;
        varying float vft, vindex;
        varying vec2 vpos;
        varying vec4 vcolor;
        uniform float featureCount;
        void main () {
          float n = mod((vpos.x*0.5+0.5)*size.x, 2.0);
          vec4 pix1 = vec4(
            floor(vindex/(256.0*256.0)),
            mod(vindex/256.0, 256.0),
            mod(vindex, 256.0),
            255.0) / 255.0;
          float opacity = floor(min(vcolor.w, 1.0));
          vec4 pix2 = vec4((2.0+opacity)/255.0, 0.0, 0.0, 1.0);
          gl_FragColor = mix(pix1, pix2, step(1.0, n));
          /*
          float opacity = floor(min(vcolor.w, 1.0));
          gl_FragColor = vec4(vindex, vft, 2.0+opacity, 1.0);
          */
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Line = require('glsl-georender-style-texture/line.h');
        #pragma glslify: readLine = require('glsl-georender-style-texture/line.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texSize;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vft, vindex, zindex, vdashLength, vdashGap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 vcolor;
        void main () {
          vft = featureType;
          Line line = readLine(styleTexture, featureType, zoom, texSize);
          vcolor = line.strokeColor;
          vdashLength = line.strokeDashLength;
          vdashGap = line.strokeDashGap;
          vindex = index;
          zindex = line.zindex;
          vec2 p = position.xy + offset;
          vec2 m = (line.fillWidth+2.0*line.strokeWidthInner)/size;
          vnorm = normalize(normal)*m;
          vdist = dist;
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
        featureCount: map.prop('featureCount'),
        texSize: map.prop('imageSize')
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
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    lineFill: {
      frag: glsl`
        precision highp float;
        uniform vec4 viewbox;
        uniform vec2 size;
        uniform float aspect;
        varying float vdashLength, vdashGap;
        varying vec2 vdist;
        varying vec4 vcolor;
        void main () {
          vec2 vb = vec2(viewbox.z-viewbox.x, viewbox.w-viewbox.y);
          vec2 s = vec2(size.x, size.y*aspect);
          float t = length(vdist*s/vb);
          float d = vdashLength;
          float g = vdashGap;
          float x = 1.0 - step(d, mod(t, d+g));
          gl_FragColor = vec4(vcolor.xyz, vcolor.w * x);
          //gl_FragColor = vec4(mix(vec3(0,1,0), vec3(1,0,0), x), 1.0);
        }
      `,
      pickFrag: `
        precision highp float;
        uniform vec2 size;
        varying float vft, vindex;
        varying vec2 vpos;
        varying vec4 vcolor;
        uniform float featureCount;
        void main () {
          float n = mod((vpos.x*0.5+0.5)*size.x, 2.0);
          vec4 pix1 = vec4(
            floor(vindex/(256.0*256.0)),
            mod(vindex/256.0, 256.0),
            mod(vindex, 256.0),
            255.0) / 255.0;
          float opacity = floor(min(vcolor.w, 1.0));
          vec4 pix2 = vec4((2.0+opacity)/255.0, 0.0, 0.0, 1.0);
          gl_FragColor = mix(pix1, pix2, step(1.0, n));
          /*
          float opacity = floor(min(vcolor.w, 1.0));
          gl_FragColor = vec4(vindex, vft, 2.0+opacity, 1.0);
          */
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Line = require('glsl-georender-style-texture/line.h');
        #pragma glslify: readLine = require('glsl-georender-style-texture/line.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texSize;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vft, vindex, zindex, vdashLength, vdashGap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 vcolor;
        void main () {
          vft = featureType;
          Line line = readLine(styleTexture, featureType, zoom, texSize);
          vcolor = line.fillColor;
          vdashLength = line.fillDashLength;
          vdashGap = line.fillDashGap;
          vindex = index;
          zindex = line.zindex + 0.1;
          vec2 p = position.xy + offset;
          vnorm = normalize(normal)*(line.fillWidth/size);
          vdist = dist;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          gl_Position += vec4(vnorm, 0, 0);
          vpos = gl_Position.xy;
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        styleTexture: map.prop('style'),
        featureCount: map.prop('featureCount'),
        texSize: map.prop('imageSize')
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
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    areas: {
      frag: glsl`
        precision highp float;
        varying vec4 vcolor;
        void main () {
          gl_FragColor = vcolor;
        }
      `,
      pickFrag: `
        precision highp float;
        uniform vec2 size;
        varying float vft, vindex;
        varying vec2 vpos;
        varying vec4 vcolor;
        uniform float featureCount;
        void main () {
          float n = mod((vpos.x*0.5+0.5)*size.x, 2.0);
          vec4 pix1 = vec4(
            floor(vindex/(256.0*256.0)),
            mod(vindex/256.0, 256.0),
            mod(vindex, 256.0),
            255.0) / 255.0;
          float opacity = floor(min(vcolor.w, 1.0));
          vec4 pix2 = vec4((4.0+opacity)/255.0, 0.0, 0.0, 1.0);
          gl_FragColor = mix(pix1, pix2, step(1.0, n));
          //gl_FragColor = vec4(vindex, vft, 4.0+opacity, 1.0);
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: Area = require('glsl-georender-style-texture/area.h');
        #pragma glslify: readArea = require('glsl-georender-style-texture/area.glsl');
        attribute vec2 position;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texSize;
        uniform float aspect, featureCount, zoom;
        uniform sampler2D styleTexture;
        varying float vft, vindex, zindex;
        varying vec2 vpos;
        varying vec4 vcolor;
        void main () {
          vft = featureType;
          Area area = readArea(styleTexture, featureType, zoom, texSize);
          vcolor = area.color;
          vindex = index;
          zindex = area.zindex;
          vec2 p = position.xy + offset;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex), 1);
          vpos = gl_Position.xy;
        }
      `,
      uniforms: {
        size: function (context) {
          size[0] = context.viewportWidth
          size[1] = context.viewportHeight
          return size
        },
        featureCount: map.prop('featureCount'),
        texSize: map.prop('imageSize'),
        styleTexture: map.prop('style')
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
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    areaBorders: {
      frag: glsl`
        precision highp float;
        uniform vec4 viewbox;
        uniform vec2 size;
        uniform float aspect;
        varying vec2 vdist;
        varying float vdashLength, vdashGap;
        varying vec4 vcolor;
        void main () {
          vec2 vb = vec2(viewbox.z-viewbox.x, viewbox.w-viewbox.y);
          vec2 s = vec2(size.x, size.y*aspect);
          float t = length(vdist*s/vb);
          float d = vdashLength;
          float g = vdashGap;
          float x = 1.0 - step(d, mod(t, d+g));
          gl_FragColor = vec4(vcolor.xyz, vcolor.w * x);
        }
      `,
      pickFrag: `
        precision highp float;
        uniform vec2 size;
        varying float vft, vindex;
        varying vec2 vpos;
        varying vec4 vcolor;
        uniform float featureCount;
        void main () {
          float n = mod((vpos.x*0.5+0.5)*size.x, 2.0);
          vec4 pix1 = vec4(
            floor(vindex/(256.0*256.0)),
            mod(vindex/256.0, 256.0),
            mod(vindex, 256.0),
            0.0);
          float opacity = floor(min(vcolor.w, 1.0));
          vec4 pix2 = vec4((4.0+opacity)/255.0, 0.0, 0.0, 1.0);
          gl_FragColor = mix(pix1, pix2, step(n, 1.0));
        }
      `,
      vert: glsl`
        precision highp float;
        #pragma glslify: AreaBorder = require('glsl-georender-style-texture/areaborder.h');
        #pragma glslify: readAreaBorder = require('glsl-georender-style-texture/areaborder.glsl');
        attribute vec2 position, normal, dist;
        attribute float featureType, index;
        uniform vec4 viewbox;
        uniform vec2 offset, size, texSize;
        uniform float featureCount, aspect, zoom;
        uniform sampler2D styleTexture;
        varying float vft, vindex, zindex, vdashLength, vdashGap;
        varying vec2 vpos, vnorm, vdist;
        varying vec4 vcolor;
        void main () {
          vft = featureType;
          AreaBorder areaBorder = readAreaBorder(styleTexture, featureType, zoom, texSize);
          vcolor = areaBorder.color;
          vdashLength = areaBorder.dashLength;
          vdashGap = areaBorder.dashGap;
          vindex = index;
          zindex = areaBorder.zindex;
          vec2 p = position.xy + offset;
          vec2 m = areaBorder.widthInner/size;
          vnorm = normalize(normal)*m;
          vdist = dist;
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
        featureCount: map.prop('featureCount'),
        texSize: map.prop('imageSize')
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
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      }
    },
    labels: (n) => { return {
      frag: glsl`
        precision highp float;
        #pragma glslify: QBZF = require('qbzf/h')
        #pragma glslify: create_qbzf = require('qbzf/create')
        #pragma glslify: read_curve = require('qbzf/read')
        varying vec2 vuv, vunits, vsize, vPxSize;
        varying float vStrokeWidth, voffset;
        varying vec3 vFillColor, vStrokeColor;
        uniform sampler2D curveTex, gridTex;
        uniform vec2 curveSize, dim;
        uniform float gridN, aspect;

        vec4 draw(vec2 uv) {
          QBZF qbzf = create_qbzf(
            uv, gridN, vsize, vunits, vec3(dim,voffset),
            gridTex, curveSize
          );
          float ldist = 1e30;
          for (int i = 0; i < ${n}; i++) {
            vec4 curve = read_curve(qbzf, gridTex, curveTex, float(i));
            if (curve.x < 0.5) break;
            qbzf.count += curve.y;
            ldist = min(ldist,length(curve.zw));
          }
          float a = 50.0;
          float outline = 1.0-smoothstep(vStrokeWidth-a,vStrokeWidth+a,ldist);
          vec3 fill = vFillColor;
          vec3 stroke = vStrokeColor;
          float cm = mod(qbzf.count,2.0);
          if (cm < 0.5 && ldist > vStrokeWidth+a) return vec4(0);
          float m = smoothstep(0.0,1.0,vStrokeWidth-ldist);
          return vec4(mix(stroke, mix(stroke,fill,m), cm),1);
        }
        void main() {
          float dx = 0.5/vPxSize.x;
          vec4 c0 = draw(vuv-vec2(dx,0));
          vec4 c1 = draw(vuv);
          vec4 c2 = draw(vuv+vec2(dx,0));
          gl_FragColor = c0*0.25 + c1*0.5 + c2*0.25;
        }`,
      vert: `
        precision highp float;
        attribute vec2 position, uv, units, gsize, pxSize;
        attribute vec3 fillColor, strokeColor;
        attribute float strokeWidth, ioffset;
        varying vec2 vuv, vunits, vsize, vPxSize;
        varying vec3 vFillColor, vStrokeColor;
        varying float vStrokeWidth, voffset;
        uniform vec4 viewbox;
        uniform float aspect, gridN;
        uniform vec2 offset, size;
        void main () {
          vuv = uv;
          vunits = units;
          vsize = gsize;
          voffset = ioffset;
          vFillColor = fillColor;
          vStrokeColor = strokeColor;
          vStrokeWidth = strokeWidth;
          vPxSize = pxSize;
          vec2 p = position.xy + offset;
          float zindex = 1000.0;
          gl_Position = vec4(
            (p.x - viewbox.x) / (viewbox.z - viewbox.x) * 2.0 - 1.0,
            ((p.y - viewbox.y) / (viewbox.w - viewbox.y) * 2.0 - 1.0) * aspect,
            1.0/(1.0+zindex),
            1
          );
        }
      `,
      uniforms: {
        curveTex: (c,props) => props.curves.texture,
        curveSize: (c,props) => props.curves.size,
        gridTex: (c,props) => props.grid.texture,
        dim: (c,props) => props.grid.dimension,
        gridN: Number(n),
      },
      attributes: {
        position: map.prop('positions'),
        uv: map.prop('uvs'),
        ioffset: map.prop('offsets'),
        units: map.prop('units'),
        gsize: map.prop('size'),
        fillColor: map.prop('fillColors'),
        strokeColor: map.prop('strokeColors'),
        strokeWidth: map.prop('strokeWidths'),
        pxSize: map.prop('pxSize'),
      },
      elements: map.prop('cells'),
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 1,
          dstRGB: 'one minus src alpha',
          dstAlpha: 1
        }
      },
    } },
  }
}
