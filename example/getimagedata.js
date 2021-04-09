module.exports = function getImageData (image) {
  var width = 1241
  var height = 168
  var canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height 
  var ctx = canvas.getContext('2d')
  ctx.globalCompositeOperation = 'copy'
  ctx.drawImage(image, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height).data
}
