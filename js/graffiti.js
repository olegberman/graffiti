var graffiti = {

  brush: [20, "95, 127, 162", 1], // size, rgb color, opacity
  strokes: [],

  drawAreaCurWidth: 620,
  drawAreaCurHeight: 310,
  drawAreaMinWidth: 620,
  drawAreaMinHeight: 310,
  drawAreaMaxWidth:  1240,
  drawAreaMaxHeight: 620,
  historyLimit: 50,

  touch: 0,
  pixelRatio: window.devicePixelRatio || 1,
  resizeRatio: 1,
  maxResizeRatio: 2,

  brushPreviewCanvas: undefined,
  brushPreviewContext: undefined,
  colorPreviewBox: undefined,
  colorPickerWrap: undefined,
  colorPicker: undefined,
  colorPickerActiveCell: undefined,
  drawAreaMainCanvas: undefined,
  drawAreaMainContext: undefined,
  drawAreaStrokeCanvas: undefined,
  drawAreaStrokeContext: undefined,
  drawAreaHistoryCanvas: undefined,
  drawAreaHistoryContext: undefined,
  drawAreaWrap: undefined,
  resizer: undefined,

  init: function() {
    var ua = navigator.userAgent.toLowerCase();
    if(/android|iphone|ipod|ipad|opera mini|opera mobi/i.test(ua)) {
      graffiti.touch = 1;
    }
    graffiti.eventsAttach();
    graffiti.colorPickerInit();
    graffiti.brushPreviewInit();
    graffiti.drawAreaInit();
    graffiti.sliderInit("thickness", 
                        ge("graffiti_slider_thickness_wrap"),
                        ge("graffiti_slider_thickness_thumb"), 
                        40);
    graffiti.sliderInit("opacity",
                        ge("graffiti_slider_opacity_wrap"),
                        ge("graffiti_slider_opacity_thumb"), 
                        80);
    graffiti.resizer = ge("graffiti_resize_wrap");
    graffiti.resizer.addEventListener(graffiti.touch ? "touchstart" : "mousedown", graffiti.resizeBegin, false);
  },

  deInit: function() {
    document.removeEventListener((graffiti.touch ? "touchmove" : "mousemove"), graffiti.eventsMouseMove, false);
    document.removeEventListener((graffiti.touch ? "touchend" : "mouseup"), graffiti.eventsMouseUp, false);
    window.removeEventListener("resize", graffiti.eventsWindowResize, true);
    document.removeEventListener("selectstart", graffiti.eventsSelectStart, true);
    document.removeEventListener("keypress", graffiti.eventsKeyPress, true);
    graffiti.resizer.removeEventListener(graffiti.touch ? "touchstart" : "mousedown", graffiti.resizeBegin);
    graffiti.history = [];
    graffiti.historyGlobal = [];
    graffiti.historyCheckpoint = null;
  },

  // events

  eventsAttach: function() {
    document.addEventListener((graffiti.touch ? "touchmove" : "mousemove"), graffiti.eventsMouseMove, false);
    document.addEventListener((graffiti.touch ? "touchend" : "mouseup"), graffiti.eventsMouseUp, false);
    window.addEventListener("resize", graffiti.eventsWindowResize, true);
    document.addEventListener("selectstart", graffiti.eventsSelectStart, true);
    document.addEventListener("keypress", graffiti.eventsKeyPress, true);
  },

  eventsMouseMove: function(event) {
    if(graffiti.touch) event.pageX = event.touches[0].pageX, event.pageY = event.touches[0].pageY;
    event.preventDefault();
    graffiti.sliderMouseMove(event);
    graffiti.drawAreaAdvanceStroke(event);
    graffiti.resize(event);
  },

  eventsMouseUp: function(event) {
    graffiti.sliderMouseUp();
    graffiti.drawAreaFinishStroke();
    graffiti.resizeFinish();
  },

  eventsWindowResize: function() {
    graffiti.drawAreaUpdateOffset();
  },

  eventsSelectStart: function(event) {
    event.preventDefault();
  },

  eventsKeyPress: function(event) {
    graffiti.shortCutHandle(event);
  },

  // brush preview

  brushPreviewInit: function() {
    graffiti.brushPreviewCanvas = ge("graffiti_brush_canvas");
    graffiti.brushPreviewContext = graffiti.brushPreviewCanvas.getContext("2d");
    graffiti.brushPreviewContext.scale(2, 2);
    graffiti.brushPreviewUpdate();
  },

  brushPreviewUpdate: function() {
    var ctx = graffiti.brushPreviewContext;
    ctx.clearRect(0, 0, 160, 160);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = graffiti.brush[0];
    ctx.strokeStyle = "rgba(" + graffiti.brush[1] + ", " + graffiti.brush[2] + ")";
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(40, 40.5);
    ctx.stroke();
  },

  // colorpicker

  colorPickerLastHighlight: undefined,

  colorPickerInit: function() {
    graffiti.colorPickerWrap = ge("graffiti_colorpicker_wrap");
    graffiti.colorPicker = ge("graffiti_colorpicker");
    graffiti.colorPickerActiveCell = ge("graffiti_colorpicker_cell_active");
    graffiti.colorPreviewBox = ge("graffiti_colorpreview_box");
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    graffiti.colorPickerWrap.style.left = position[0] - 50 + "px";
    graffiti.colorPickerWrap.style.top = position[1] + 30 + "px";
    var html = "";
    var colors = [];
    for(var r = 0; r < 6; r++) {
      for(var g = 0; g < 6; g++) {
        for(var b = 0; b < 6; b++) {
          colors[r * 36 + g * 6 + b] = "rgb(" + (r / 5 * 255) + "," 
          + (g / 5 * 255) + "," + (b / 5 * 255) + ")";
        }
      }
    }
    for(var j = 0; j < 12; j++) {
      html += "<div class='graffiti_colorpicker_row'>";
      for(var i = 0; i < 18; i++) {
        var r = Math.floor(i / 6) + 3 * Math.floor(j / 6);
        var g = i % 6;
        var b = j % 6;
        var n = r * 36 + g * 6 + b;
        html += "<div class='graffiti_colorpicker_cell fl_l' \
                      style='background-color: " + colors[n] + "' \
                      onmouseover='graffiti.colorPickerHighlight(this)' \
                      ></div>";
      }
      html += "</div>";
    }
    graffiti.colorPicker.innerHTML = html;
  },

  colorPickerOpened: 0,

  colorPickerToggle: function() {
    if(graffiti.colorPickerOpened == 0) {
      var position = getXY(ge("graffiti_colorpreview_wrap"));
      graffiti.colorPickerWrap.style.display = "block";
      graffiti.colorPickerWrap.style.top = (position[1] - 230) + "px";
      graffiti.colorPickerOpened = 1;
    } else {
      graffiti.colorPickerHide();
    }
  },

  colorPickerHide: function() {
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    graffiti.colorPickerActiveCell.style.display = "none";
    graffiti.colorPickerWrap.style.top = (position[1] + 30) + "px";
    graffiti.colorPickerWrap.style.display = "none";
    graffiti.colorPickerOpened = 0;
  },

  colorPickerHighlight: function(target) {
    if(graffiti.colorPickerOpened == 1) {
      var cleanRGB = target.style.backgroundColor.replace(/(rgb\(|\))/g, "")
      graffiti.colorPickerLastHighlight = cleanRGB;
      var position = getXY(target);
      graffiti.colorPickerActiveCell.style.display = "block";
      graffiti.colorPickerActiveCell.style.left = position[0] + "px";
      graffiti.colorPickerActiveCell.style.top = position[1] + "px";
    } else {
      graffiti.colorPickerActiveCell.style.display = "none";
    }
  },

  colorPickerChooseColor: function() {
    graffiti.brush[1] = graffiti.colorPickerLastHighlight;
    graffiti.colorPreviewBox.style.backgroundColor = "rgb(" + graffiti.brush[1] + ")";
    graffiti.brushPreviewUpdate();
    graffiti.colorPickerHide();
  },

  // sliders

  sliders: {},

  sliderActive: {},

  sliderInit: function(id, wrapper, thumb, value) {
    graffiti.sliders[id] = {id: id, wrapper: wrapper, thumb: thumb, value: value};
    var pixelPosition = (getSize(wrapper)[0] / 100 * value) + "px";
    graffiti.sliders[id].thumb.style.left = pixelPosition;
    wrapper.addEventListener("wheel", graffiti.sliderWheel, false);
    wrapper.addEventListener("DOMMouseScroll", graffiti.sliderWheel, false);
    graffiti.sliderUpdated(id);
  },

  sliderMouseDown: function(id, event) {
    if(graffiti.touch) event.pageX = event.touches[0].pageX, event.pageY = event.touches[0].pageY;
    graffiti.sliderActive = graffiti.sliders[id];
    graffiti.sliderMove(event);
  },

  sliderMouseMove: function(event) {
    if(!isEmpty(graffiti.sliderActive)) {
      graffiti.sliderMove(event);
    }
  },

  sliderMouseUp: function() {
    graffiti.sliderActive = {};
  },

  sliderHovered: {},

  sliderBeforeWheel: function(id) {
    graffiti.sliderHovered = graffiti.sliders[id];
  },

  sliderWheel: function() {
    graffiti.sliderMove(event);
  },

  sliderMove: function(event) {
    event.preventDefault();
    var pixelPosition;
    var slider = undefined;
    if(isEmpty(graffiti.sliderActive)) {
      slider = graffiti.sliderHovered;
    } else {
      slider = graffiti.sliderActive;
    }
    var width = getSize(slider.wrapper)[0] - 5;
    if(event.type == "wheel" || event.type == "DOMMouseScroll") {
      var delta = (event.detail < 0 || event.wheelDelta > 0) ? -5 : 5;
      pixelPosition = (width / 100 * slider.value) + delta;
    } else {
      pixelPosition = event.pageX - getXY(slider.wrapper)[0];
    }
    slider.value = pixelPosition / width * 100;
    if(pixelPosition > width) pixelPosition = width, slider.value = 100;
    if(pixelPosition < 0) pixelPosition = 0, slider.value = 0;
    slider.thumb.style.left = pixelPosition + "px";
    graffiti.sliderUpdated(slider.id);
  },

  sliderUpdated: function(id) {
    switch(id) {
      case "thickness":
        var thickness = graffiti.sliders[id].value / 100 * 70;
        graffiti.brush[0] = (thickness <= 0) ? 1 : thickness;
        graffiti.brushPreviewUpdate();
      break;
      case "opacity":
        var opacity = graffiti.sliders[id].value / 100;
        graffiti.brush[2] = (opacity <= 0) ? 0.01 : opacity;
        graffiti.brushPreviewUpdate();
      break;
    }
  },

  // draw area

  drawAreaInUse: 0,

  drawAreaWrapOffset: [], 

  drawAreaInit: function() {
    graffiti.drawAreaWrap = ge("graffiti_drawarea_wrap");
    graffiti.drawAreaWrap.addEventListener((graffiti.touch ? "touchstart" : "mousedown"), function(event) {
      if(graffiti.touch) event.pageX = event.touches[0].pageX, event.pageY = event.touches[0].pageY;
      graffiti.drawAreaBeginStroke(event);
    });
    graffiti.drawAreaMainCanvas = ge("graffiti_canvas_main");
    graffiti.drawAreaMainContext = graffiti.drawAreaMainCanvas.getContext("2d");
    graffiti.drawAreaStrokeCanvas = ge("graffiti_canvas_stroke");
    graffiti.drawAreaStrokeContext = graffiti.drawAreaStrokeCanvas.getContext("2d");
    graffiti.drawAreaHistoryCanvas = ge("graffiti_canvas_history");
    graffiti.drawAreaHistoryContext = graffiti.drawAreaHistoryCanvas.getContext("2d");
    var data = graffiti.drawAreaGetData();
    graffiti.drawAreaHistoryCanvas.width = data[4];
    graffiti.drawAreaHistoryCanvas.height = data[5];
    graffiti.drawAreaUpdateSize();
    graffiti.drawAreaUpdateOffset();
    graffiti.resizeRatio = graffiti.drawAreaCurWidth / graffiti.drawAreaMinWidth;
  },

  drawAreaBeginStroke: function(event) {
    var pos = graffiti.drawAreaWrapOffset;
    graffiti.strokes.push([event.pageX - pos[0], event.pageY - pos[1]]);
    graffiti.drawAreaInUse = 1;
    graffiti.draw(graffiti.drawAreaStrokeContext);
  },

  drawAreaAdvanceStroke: function(event) {
    if(graffiti.drawAreaInUse == 1) {
      var data = graffiti.drawAreaGetData();
      graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
      var pos = graffiti.drawAreaWrapOffset;
      graffiti.strokes.push([event.pageX - pos[0], event.pageY - pos[1]]);
      graffiti.draw(graffiti.drawAreaStrokeContext);
    }
  },

  drawAreaFinishStroke: function() {
    if(graffiti.drawAreaInUse == 1) {
      var data = graffiti.drawAreaGetData();
      graffiti.drawAreaInUse = 0;
      graffiti.draw(graffiti.drawAreaMainContext);
      var strokes = graffiti.drawUnflagStrokes(graffiti.strokes);
      graffiti.historyAddStep(strokes, graffiti.brush.slice(), graffiti.resizeRatio);
      graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
      graffiti.strokes = [];
    }
  },

  drawAreaErase: function() {
    var data = graffiti.drawAreaGetData();
    graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
    graffiti.history = [];
    graffiti.historyGlobal = [];
    graffiti.historyCheckpoint = null;
  },

  drawAreaUpdateSize: function() {
    var r = graffiti.pixelRatio;
    var w = parseInt(graffiti.drawAreaWrap.style.width) * r;
    var h = parseInt(graffiti.drawAreaWrap.style.height) * r;
    graffiti.drawAreaMainCanvas.width = w;
    graffiti.drawAreaMainCanvas.height = h;
    graffiti.drawAreaStrokeCanvas.width = w;
    graffiti.drawAreaStrokeCanvas.height = h;
  },

  drawAreaUpdateOffset: function() {
    graffiti.drawAreaWrapOffset = getXY(graffiti.drawAreaWrap);
  },

  // draw

  draw: function(ctx, history, ratio) {
    var strokes = undefined;
    var recursive = false;
    if(history) {
      history = history.slice();
      if(history.length != 0) {
        var step = history.shift();
        strokes = graffiti.drawGetNormalizedStrokes(step[0], step[2], ratio);
        recursive = true;
      } else {
        return false;
      }
      ctx.lineWidth = Math.round(graffiti.drawGetNormalizedBrushSize(step[1][0], ratio));
      ctx.strokeStyle = "rgba(" + step[1][1] + ", " + step[1][2] + ")";
    } else {
      strokes = graffiti.drawGetNormalizedStrokes(graffiti.strokes);
      ctx.lineWidth = Math.round(graffiti.drawGetNormalizedBrushSize(graffiti.brush[0]));
      ctx.strokeStyle = "rgba(" + graffiti.brush[1] + ", " + graffiti.brush[2] + ")";
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if(strokes.length < 2) {
      ctx.moveTo(strokes[0][0], strokes[0][1]);
      ctx.lineTo(strokes[0][0] + 0.51, strokes[0][1]);
    } else {
      ctx.moveTo(strokes[0][0], strokes[0][1]);
      ctx.lineTo((strokes[0][0] + strokes[1][0]) * 0.5, 
                 (strokes[0][1] + strokes[1][1]) * 0.5);
      var i = 0;
      while(++i < (strokes.length - 1)) {
        var abs1 = Math.abs(strokes[i - 1][0] - strokes[i][0])
                 + Math.abs(strokes[i - 1][1] - strokes[i][1])
                 + Math.abs(strokes[i][0] - strokes[i + 1][0])
                 + Math.abs(strokes[i][1] - strokes[i + 1][1]);
        var abs2 = Math.abs(strokes[i - 1][0] - strokes[i + 1][0])
                 + Math.abs(strokes[i - 1][1] -  strokes[i + 1][1]);
        if(abs1 > 10 && abs2 > abs1 * 0.8) {
          ctx.quadraticCurveTo(strokes[i][0], strokes[i][1],
                              (strokes[i][0] + strokes[i + 1][0]) * 0.5,
                              (strokes[i][1] + strokes[i + 1][1]) * 0.5);
          continue;
        }
      ctx.lineTo(strokes[i][0], strokes[i][1]);
      ctx.lineTo((strokes[i][0] + strokes[i + 1][0]) * 0.5, 
                 (strokes[i][1] + strokes[i + 1][1]) * 0.5);
      }
      ctx.lineTo(strokes[strokes.length - 1][0], strokes[strokes.length - 1][1]);
      ctx.moveTo(strokes[strokes.length - 1][0], strokes[strokes.length - 1][1]);
    }
    ctx.stroke();
    ctx.closePath();
    if(recursive) graffiti.draw(ctx, history, ratio);
  },

  drawGetNormalizedStrokes: function(strokes, oldRatio, newRatio, ignoreRetina) {
    strokes = strokes.slice();
    oldRatio = oldRatio ? oldRatio : graffiti.resizeRatio;
    newRatio = newRatio ? newRatio : graffiti.resizeRatio;
    var pixelRatio = ignoreRetina ? 1 : graffiti.pixelRatio;
    var ratio = newRatio / oldRatio * pixelRatio;
    for(var i = 0; i < strokes.length; i++) {
      strokes[i] = strokes[i].slice();
      if(!strokes[i][2]) {
        strokes[i][0] *= ratio;
        strokes[i][1] *= ratio;
        strokes[i][2] = 1;
      }
    }
    return strokes;
  },

  drawGetNormalizedBrushSize: function(brushSize, ratio, ignoreRetina) {
    var pixelRatio = ignoreRetina ? 1 : graffiti.pixelRatio;
    return brushSize * (ratio ? ratio : graffiti.resizeRatio) * pixelRatio;
  },

  drawUnflagStrokes: function(strokes) {
    strokes = strokes.slice();
    for(var i = 0; i < strokes.length; i++) {
      strokes[i][2] = 0;
    }
    return strokes;
  },

  // history

  history: [],
  historyGlobal: [],
  historyCheckpoint: undefined,
  historyStepBackLock: 0,

  historyAddStep: function(strokes, brush, resizeRatio) {
    graffiti.history.push([strokes, brush, resizeRatio]);
    graffiti.historyGlobal.push([strokes, brush, resizeRatio]);
    if(graffiti.history.length == graffiti.historyLimit * 2) {
      var data = graffiti.drawAreaGetData();
      var checkPointStrokes = graffiti.history.splice(0, graffiti.historyLimit);
      graffiti.historyDrawToCanvas(checkPointStrokes, function() {
        graffiti.historyCheckpoint = graffiti.drawAreaHistoryCanvas.toDataURL("image/png", 1);
        graffiti.drawAreaHistoryContext.clearRect(0, 0, data[4], data[5]);
      });
    }
  },

  historyDrawToCanvas: function(strokes, callback) {
    var data = graffiti.drawAreaGetData();
    if(graffiti.historyCheckpoint) {
      var image = new Image();
      image.onload = function() {
        graffiti.drawAreaHistoryContext.drawImage(image, 0, 0, data[4], data[5]);
        resolveAsynch();
      }
      image.src = graffiti.historyCheckpoint;
    } else {
      resolveAsynch();
    }
    function resolveAsynch() {
      graffiti.draw(graffiti.drawAreaHistoryContext, strokes, graffiti.maxResizeRatio);
      callback();
    }
  },

  historyStepBack: function() {
    if(graffiti.historyStepBackLock == 1) { 
      return false;
    }
    var data = graffiti.drawAreaGetData();
    if(graffiti.history.length == 0) {
      graffiti.drawAreaErase();
      graffiti.historyCheckpoint = null;
    } else {
      graffiti.historyStepBackLock = 1;
      graffiti.history.pop();
      graffiti.historyGlobal.pop();
      graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
      if(graffiti.historyCheckpoint) {
        var image = new Image();
        image.onload = function() {
          graffiti.drawAreaMainContext.drawImage(image, 0, 0, data[2], data[3]);
          resolveAsynch();
        }
        image.src = graffiti.historyCheckpoint;
      } else {
        resolveAsynch();
      }
    }
    function resolveAsynch() {
      graffiti.draw(graffiti.drawAreaMainContext, graffiti.history);
      graffiti.historyStepBackLock = 0;
    }
  },

  drawAreaGetData: function() {
    return [
            parseInt(graffiti.drawAreaWrap.style.width),
            parseInt(graffiti.drawAreaWrap.style.height),
            graffiti.drawAreaMainCanvas.width,
            graffiti.drawAreaMainCanvas.height,
            graffiti.drawAreaMaxWidth * graffiti.pixelRatio,
            graffiti.drawAreaMaxHeight * graffiti.pixelRatio
           ];
  },

  // resize

  resizing: 0,

  resize: function(event) {
    if(graffiti.resizing == 1) {
      var canvasHeight = parseInt(graffiti.drawAreaWrap.style.height);
      var resizerY = getXY(ge(graffiti.resizer))[1];
      var newHeight = canvasHeight + event.pageY - resizerY;
      var newWidth = graffiti.drawAreaMinWidth / graffiti.drawAreaMinHeight * newHeight;
      if(newHeight < graffiti.drawAreaMinHeight) newHeight = graffiti.drawAreaMinHeight;
      if(newWidth < graffiti.drawAreaMinWidth) newWidth = graffiti.drawAreaMinWidth;
      if(newHeight > graffiti.drawAreaMaxHeight) newHeight = graffiti.drawAreaMaxHeight;
      if(newWidth > graffiti.drawAreaMaxWidth) newWidth = graffiti.drawAreaMaxWidth;
      graffiti.drawAreaWrap.style.height = newHeight + "px";
      graffiti.drawAreaWrap.style.width = newWidth + "px";
      // remove in production
      ge("popup_wrap").style.width = (newWidth + 22) + "px";
      // /remove in production
      graffiti.drawAreaMainCanvas.style.width = newWidth + "px";
      graffiti.drawAreaMainCanvas.style.height = newHeight + "px";
      graffiti.drawAreaStrokeCanvas.style.width = newWidth + "px";
      graffiti.drawAreaStrokeCanvas.style.height = newHeight + "px";
      graffiti.drawAreaCurWidth = newWidth;
      graffiti.drawAreaCurHeight = newHeight;
    }
  },

  resizeBegin: function() {
    graffiti.resizing = 1;
  },

  resizeFinish: function() {
    if(graffiti.resizing) {
      graffiti.resizing = 0;
      graffiti.drawAreaStrokeCanvas.style.top = "-" + graffiti.drawAreaCurHeight + "px";
      graffiti.drawAreaUpdateOffset();
      graffiti.resizeRatio = graffiti.drawAreaCurWidth / graffiti.drawAreaMinWidth;
      graffiti.drawAreaUpdateSize();
      if(graffiti.historyCheckpoint) {
        var image = new Image();
        image.onload = function() {
          var data = graffiti.drawAreaGetData();
          graffiti.drawAreaMainContext.drawImage(image, 0, 0, data[2], data[3]);
          resolveAsynch();
        }
        image.src = graffiti.historyCheckpoint;
      } else {
        resolveAsynch();
      }
      function resolveAsynch() {
        graffiti.draw(graffiti.drawAreaMainContext, graffiti.history);
      }
    }
  },

  // export

  exportLock: 0,

  exportSvg: function() {
    if(graffiti.historyGlobal.length == 0) return false;
    graffiti.exportLock = 1;
    var history = graffiti.historyGlobal.slice();
    var maxW = graffiti.drawAreaMaxWidth;
    var maxH = graffiti.drawAreaMaxHeight;
    var file = '<?xml version="1.0" standalone="yes"?>\
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"> \
<svg width="' + maxW + 'px" height="' + maxH + 'px" viewBox="0 0 ' + maxW + ' ' + maxH + '" xmlns="http://www.w3.org/2000/svg" version="1.1">';
    for(var i = 0; i < history.length; i++) {
      file += graffiti.exportSvgGetChunk(history[i]);
    }
    file += '</svg>';
    window.open("data:image/svg+xml," + encodeURIComponent(file));
  },

  exportSvgGetChunk: function(step) {
    var chunk = '<path d="';
    var strokes = graffiti.drawGetNormalizedStrokes(step[0], step[2], graffiti.maxResizeRatio, true);
    var size = graffiti.drawGetNormalizedBrushSize(step[1][0], graffiti.maxResizeRatio, true);
    var color = step[1][1];
    var opacity = step[1][2];
    if(strokes.length < 2) {
      chunk += "M" + strokes[0][0] + "," + strokes[0][1] + " ";
      chunk += "L" + (strokes[0][0] + 0.51) + "," + strokes[0][1] + " ";
      chunk += '" fill="none" stroke="rgb(' + color + ')" stroke-opacity="' + opacity + '\
      " stroke-width="' + size + '" stroke-linecap="round" stroke-linejoin="round" />';
      return chunk;
    }
    chunk += "M" + strokes[0][0] + "," + strokes[0][1] + " ";
    chunk += "L" + ((strokes[0][0] + strokes[1][0]) * 0.5) + "," +
                   ((strokes[0][1] + strokes[1][1]) * 0.5) + " ";
    var i = 0;
    while(++i < (strokes.length - 1)) {
        var abs1 = Math.abs(strokes[i - 1][0] - strokes[i][0])
                 + Math.abs(strokes[i - 1][1] - strokes[i][1])
                 + Math.abs(strokes[i][0] - strokes[i + 1][0])
                 + Math.abs(strokes[i][1] - strokes[i + 1][1]);
        var abs2 = Math.abs(strokes[i - 1][0] - strokes[i + 1][0])
                 + Math.abs(strokes[i - 1][1] -  strokes[i + 1][1]);
    if(abs1 > 10 && abs2 > abs1 * 0.8) {
      chunk += "Q" + strokes[i][0] + "," + strokes[i][1] + " " 
                   + ((strokes[i][0] + strokes[i + 1][0]) * 0.5) + "," 
                   + ((strokes[i][1] + strokes[i + 1][1]) * 0.5) + " ";
      continue;
    }
    chunk += "L" + strokes[i][0] + "," + strokes[i][1] + " ";
    chunk += "L" + ((strokes[i][0] + strokes[i + 1][0]) * 0.5) + "," 
                 + ((strokes[i][1] + strokes[i + 1][1]) * 0.5) + " ";
    }
    chunk += "L" + strokes[strokes.length - 1][0] + "," + strokes[strokes.length - 1][1] + " ";
    chunk += '" fill="none" stroke="rgb(' + color + ')" stroke-opacity="' + opacity + '" \
                stroke-width="' + size + '" stroke-linecap="round" stroke-linejoin="round" />';
    return chunk;
  },

  exportImage: function(callback) {
    graffiti.historyDrawToCanvas(graffiti.history, function() {
      callback(graffiti.drawAreaHistoryCanvas.toDataURL("image/png", 1));
    });
  },

  // shortcuts

  shortCutEastern: 0,

  shortCutHandle: function(event) {
    event.preventDefault();
    if(event.shiftKey) {
      console.log(event);
      switch(event.keyCode) {
        // ctrl + z
        case 90:
          graffiti.historyStepBack();
        break;
        // ctrl + e (erase)
        case 78:
          graffiti.drawAreaErase();
        break;
        // ctrl + s (save)
        case 83:
          graffiti.exportSvg();
        break;
        // eastern
        case 41:
          if(graffiti.shortCutEastern) return false;
          graffiti.shortCutEastern = 1;
          var words = ["much art", "wow", "cool", "what r you drawing", "very graffiti", "amaze", "u found eastern"];
          graffiti.drawAreaMainContext.fillStyle = "rgb(" + Math.round(rand(0, 255)) 
                                                   + ", " + Math.round(rand(0, 255))
                                                   + ", " + Math.round(rand(0, 255)) + ")";
          graffiti.drawAreaMainContext.font = Math.round(rand(20, 40)) + "px Comic Sans MS";
          var w = graffiti.drawAreaCurWidth * graffiti.pixelRatio;
          var h = graffiti.drawAreaCurHeight * graffiti.pixelRatio;
          graffiti.drawAreaMainContext.fillText(words[Math.floor(rand(0, words.length - 1))], rand(0, w), rand(0, h));
        break;
        // export raster image
        case 68:
          graffiti.exportImage(function(file) {
            window.open(file);
          });
        break;
      }
    }
  },

};

document.addEventListener("DOMContentLoaded", function() {
  graffiti.init();
}, false);
