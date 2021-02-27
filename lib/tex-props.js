module.exports = function () {
  var zoomStart = 1
  var zoomEnd = 21 //inclusive
  var zoomCount = zoomEnd - zoomStart + 1
  var heights = {
    point: 2*zoomCount,
    line: 4*zoomCount,
    area: 2*zoomCount
  }
  var totalHeight = heights.point + heights.line + heights.area
  var r0 = heights.point/totalHeight
  var r1 = (heights.point + heights.line)/totalHeight
  var ranges = [
    [0, r0],
    [r0, r1],
    [r1, 1]
  ]

  return { 
    zoomStart,
    zoomEnd,
    heights,
    ranges
  }
}
