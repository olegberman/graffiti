// Developed by Oleg Berman
// http://vk.com/olegberman

var Graffiti = {

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
      Graffiti.touch = 1;
    }
    Graffiti.attachEvents();
    Graffiti.colorPickerInit();
    Graffiti.brushPreviewInit();
    Graffiti.drawAreaInit();
    Graffiti.sliderInit("thickness",
                        ge("graffiti_slider_thickness_wrap"),
                        ge("graffiti_slider_thickness_thumb"),
                        40);
    Graffiti.sliderInit("opacity",
                        ge("graffiti_slider_opacity_wrap"),
                        ge("graffiti_slider_opacity_thumb"),
                        80);
    Graffiti.resizer = ge("graffiti_resize_wrap");
    addEvent(Graffiti.resizer, (Graffiti.touch ? "touchstart" : "mousedown"), Graffiti.resizeBegin);
  },

  deInit: function() {
    Graffiti.history = [];
    Graffiti.historyGlobal = [];
    Graffiti.historyCheckpoint = null;
    Graffiti.detachEvents();
  },

  // events

  attachEvents: function() {
    addEvent(document, (Graffiti.touch ? "touchmove" : "mousemove"), Graffiti.eventsMouseMove);
    addEvent(document, (Graffiti.touch ? "touchend" : "mouseup"), Graffiti.eventsMouseUp);
    addEvent(window, "resize", Graffiti.eventsWindowResize);
    addEvent(document, "selectstart", Graffiti.eventsSelectStart);
    addEvent(document, "keypress", Graffiti.eventsKeyPress);
  },

  detachEvents: function() {
    removeEvent(document, (Graffiti.touch ? "touchmove" : "mousemove"), Graffiti.eventsMouseMove);
    removeEvent(document, (Graffiti.touch ? "touchend" : "mouseup"), Graffiti.eventsMouseUp);
    removeEvent(window, "resize", Graffiti.eventsWindowResize);
    removeEvent(document, "selectstart", Graffiti.eventsSelectStart);
    removeEvent(document, "keypress", Graffiti.eventsKeyPress);
    removeEvent(Graffiti.resizer, (Graffiti.touch ? "touchstart" : "mousedown"), Graffiti.resizeBegin);
  },

  isChanged: function() {
    return (Graffiti.historyGlobal.length || Graffiti.historyCheckpoint) ? true : false;
  },

  eventsMouseMove: function(event) {
    if(Graffiti.touch) event.pageX = event.touches[0].pageX, event.pageY = event.touches[0].pageY;
    Graffiti.sliderMouseMove(event);
    Graffiti.drawAreaAdvanceStroke(event);
    Graffiti.resize(event);
    return cancelEvent(event);
  },

  eventsMouseUp: function(event) {
    Graffiti.sliderMouseUp();
    Graffiti.drawAreaFinishStroke();
    Graffiti.resizeFinish();
  },

  eventsWindowResize: function() {
    Graffiti.drawAreaUpdateOffset();
  },

  eventsSelectStart: function(event) {
    return cancelEvent(event);
  },

  eventsKeyPress: function(event) {
    Graffiti.shortCutHandle(event);
    return cancelEvent(event);
  },

  // brush preview

  brushPreviewInit: function() {
    Graffiti.brushPreviewCanvas = ge("graffiti_brush_canvas");
    Graffiti.brushPreviewContext = Graffiti.brushPreviewCanvas.getContext("2d");
    Graffiti.brushPreviewContext.scale(2, 2);
    Graffiti.brushPreviewUpdate();
  },

  brushPreviewUpdate: function() {
    var ctx = Graffiti.brushPreviewContext;
    ctx.clearRect(0, 0, 160, 160);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Graffiti.brush[0];
    ctx.strokeStyle = "rgba(" + Graffiti.brush[1] + ", " + Graffiti.brush[2] + ")";
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(40, 40.5);
    ctx.stroke();
  },

  // colorpicker

  colorPickerLastHighlight: undefined,

  colorPickerInit: function() {
    Graffiti.colorPickerWrap = ge("graffiti_colorpicker_wrap");
    Graffiti.colorPicker = ge("graffiti_colorpicker");
    Graffiti.colorPickerActiveCell = ge("graffiti_colorpicker_cell_active");
    Graffiti.colorPreviewBox = ge("graffiti_colorpreview_box");
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    Graffiti.colorPickerWrap.style.left = position[0] - 50 + "px";
    Graffiti.colorPickerWrap.style.top = position[1] + 30 + "px";
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
                      onmouseover='Graffiti.colorPickerHighlight(this)' \
                      ></div>";
      }
      html += "</div>";
    }
    Graffiti.colorPicker.innerHTML = html;
  },

  colorPickerOpened: 0,

  colorPickerToggle: function() {
    if(Graffiti.colorPickerOpened == 0) {
      var anchorPos = getXY(ge("graffiti_colorpreview_wrap"));
      Graffiti.colorPickerWrap.style.left = anchorPos[0] - 50 + "px";
      Graffiti.colorPickerWrap.style.top = anchorPos[1] + 30 + "px";
      var position = getXY(ge("graffiti_colorpreview_wrap"));
      Graffiti.colorPickerWrap.style.display = "block";
      animate(Graffiti.colorPickerWrap, { opacity: 1,
                                          top: position[1] - 230 },
                                          100);
      Graffiti.colorPickerOpened = 1;
    } else {
      Graffiti.colorPickerHide();
    }
  },

  colorPickerHide: function() {
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    Graffiti.colorPickerActiveCell.style.display = "none";
    animate(Graffiti.colorPickerWrap, { opacity: 0,
                                        top: position[1] + 30 },
                                        100,
    function() {
      Graffiti.colorPickerWrap.style.display = "none";
    });
    Graffiti.colorPickerOpened = 0;
  },

  colorPickerHighlight: function(target) {
    if(Graffiti.colorPickerOpened) {
      var cleanRGB = target.style.backgroundColor.replace(/(rgb\(|\))/g, "")
      Graffiti.colorPickerLastHighlight = cleanRGB;
      var position = getXY(target);
      Graffiti.colorPickerActiveCell.style.display = "block";
      Graffiti.colorPickerActiveCell.style.left = position[0] + "px";
      Graffiti.colorPickerActiveCell.style.top = position[1] + "px";
    } else {
      Graffiti.colorPickerActiveCell.style.display = "none";
    }
  },

  colorPickerChooseColor: function() {
    Graffiti.brush[1] = Graffiti.colorPickerLastHighlight;
    Graffiti.colorPreviewBox.style.backgroundColor = "rgb(" + Graffiti.brush[1] + ")";
    Graffiti.brushPreviewUpdate();
    Graffiti.colorPickerHide();
  },

  // sliders

  sliders: {},

  sliderActive: {},

  sliderInit: function(id, wrapper, thumb, value) {
    Graffiti.sliders[id] = {id: id, wrapper: wrapper, thumb: thumb, value: value};
    var pixelPosition = (getSize(wrapper)[0] / 100 * value) + "px";
    animate(Graffiti.sliders[id].thumb, {left : pixelPosition + "px"}, 300);
    wrapper.addEventListener("wheel", Graffiti.sliderWheel, false);
    wrapper.addEventListener("DOMMouseScroll", Graffiti.sliderWheel, false);
    Graffiti.sliderUpdated(id);
  },

  sliderMouseDown: function(id, event) {
    if(Graffiti.touch) event.pageX = event.touches[0].pageX, event.pageY = event.touches[0].pageY;
    Graffiti.sliderActive = Graffiti.sliders[id];
    Graffiti.sliderMove(event);
  },

  sliderMouseMove: function(event) {
    if(!isEmpty(Graffiti.sliderActive)) {
      Graffiti.sliderMove(event);
    }
  },

  sliderMouseUp: function() {
    Graffiti.sliderActive = {};
  },

  sliderHovered: {},

  sliderBeforeWheel: function(id) {
    Graffiti.sliderHovered = Graffiti.sliders[id];
  },

  sliderWheel: function() {
    Graffiti.sliderMove(event);
  },

  sliderMove: function(event) {
    var pixelPosition;
    var slider = undefined;
    if(isEmpty(Graffiti.sliderActive)) {
      slider = Graffiti.sliderHovered;
    } else {
      slider = Graffiti.sliderActive;
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
    Graffiti.sliderUpdated(slider.id);
  },

  sliderUpdated: function(id) {
    switch(id) {
      case "thickness":
        var thickness = Graffiti.sliders[id].value / 100 * 70;
        Graffiti.brush[0] = (thickness <= 0) ? 1 : thickness;
        Graffiti.brushPreviewUpdate();
      break;
      case "opacity":
        var opacity = Graffiti.sliders[id].value / 100;
        Graffiti.brush[2] = (opacity <= 0) ? 0.01 : opacity;
        Graffiti.brushPreviewUpdate();
      break;
    }
  },

  // draw area

  drawAreaInUse: 0,

  drawAreaWrapOffset: [],

  drawAreaInit: function() {
    Graffiti.drawAreaWrap = ge("graffiti_drawarea_wrap");
    Graffiti.drawAreaWrap.addEventListener((Graffiti.touch ? "touchstart" : "mousedown"), function(event) {
      if(Graffiti.touch) event.pageX = event.touches[0].pageX, event.pageY = event.touches[0].pageY;
      Graffiti.drawAreaBeginStroke(event);
    });
    Graffiti.drawAreaMainCanvas = ge("graffiti_canvas_main");
    Graffiti.drawAreaMainContext = Graffiti.drawAreaMainCanvas.getContext("2d");
    Graffiti.drawAreaStrokeCanvas = ge("graffiti_canvas_stroke");
    Graffiti.drawAreaStrokeContext = Graffiti.drawAreaStrokeCanvas.getContext("2d");
    Graffiti.drawAreaHistoryCanvas = ge("graffiti_canvas_history");
    Graffiti.drawAreaHistoryContext = Graffiti.drawAreaHistoryCanvas.getContext("2d");
    var data = Graffiti.drawAreaGetData();
    Graffiti.drawAreaHistoryCanvas.width = data[4];
    Graffiti.drawAreaHistoryCanvas.height = data[5];
    Graffiti.drawAreaUpdateSize();
    Graffiti.drawAreaUpdateOffset();
    Graffiti.resizeRatio = Graffiti.drawAreaCurWidth / Graffiti.drawAreaMinWidth;
  },

  drawAreaBeginStroke: function(event) {
    var pos = Graffiti.drawAreaWrapOffset;
    Graffiti.strokes.push([event.pageX - pos[0], event.pageY - pos[1]]);
    Graffiti.drawAreaInUse = 1;
    Graffiti.draw(Graffiti.drawAreaStrokeContext);
  },

  drawAreaAdvanceStroke: function(event) {
    if(Graffiti.drawAreaInUse) {
      var data = Graffiti.drawAreaGetData();
      Graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
      var pos = Graffiti.drawAreaWrapOffset;
      Graffiti.strokes.push([event.pageX - pos[0], event.pageY - pos[1]]);
      Graffiti.draw(Graffiti.drawAreaStrokeContext);
    }
  },

  drawAreaFinishStroke: function() {
    if(Graffiti.drawAreaInUse) {
      var data = Graffiti.drawAreaGetData();
      Graffiti.drawAreaInUse = 0;
      Graffiti.draw(Graffiti.drawAreaMainContext);
      var strokes = Graffiti.drawUnflagStrokes(Graffiti.strokes);
      Graffiti.historyAddStep(strokes, Graffiti.brush.slice(), Graffiti.resizeRatio);
      Graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
      Graffiti.strokes = [];
    }
  },

  drawAreaErase: function() {
    var data = Graffiti.drawAreaGetData();
    animate(Graffiti.drawAreaMainCanvas, {opacity: 0}, 200, function() {
      Graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
      Graffiti.drawAreaMainCanvas.style.opacity = "1";
    });
    Graffiti.history = [];
    Graffiti.historyGlobal = [];
    Graffiti.historyCheckpoint = null;
  },

  drawAreaUpdateSize: function() {
    var r = Graffiti.pixelRatio;
    var w = parseInt(Graffiti.drawAreaWrap.style.width) * r;
    var h = parseInt(Graffiti.drawAreaWrap.style.height) * r;
    Graffiti.drawAreaMainCanvas.width = w;
    Graffiti.drawAreaMainCanvas.height = h;
    Graffiti.drawAreaStrokeCanvas.width = w;
    Graffiti.drawAreaStrokeCanvas.height = h;
  },

  drawAreaUpdateOffset: function() {
    Graffiti.drawAreaWrapOffset = getXY(Graffiti.drawAreaWrap);
  },

  // draw

  draw: function(ctx, history, ratio) {
    var strokes = undefined;
    var recursive = false;
    if(history) {
      history = history.slice();
      if(history.length != 0) {
        var step = history.shift();
        strokes = Graffiti.drawGetNormalizedStrokes(step[0], step[2], ratio);
        recursive = true;
      } else {
        return false;
      }
      ctx.lineWidth = Math.round(Graffiti.drawGetNormalizedBrushSize(step[1][0], ratio));
      ctx.strokeStyle = "rgba(" + step[1][1] + ", " + step[1][2] + ")";
    } else {
      strokes = Graffiti.drawGetNormalizedStrokes(Graffiti.strokes);
      ctx.lineWidth = Math.round(Graffiti.drawGetNormalizedBrushSize(Graffiti.brush[0]));
      ctx.strokeStyle = "rgba(" + Graffiti.brush[1] + ", " + Graffiti.brush[2] + ")";
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
    if(recursive) Graffiti.draw(ctx, history, ratio);
  },

  drawGetNormalizedStrokes: function(strokes, oldRatio, newRatio, ignoreRetina) {
    strokes = strokes.slice();
    oldRatio = oldRatio ? oldRatio : Graffiti.resizeRatio;
    newRatio = newRatio ? newRatio : Graffiti.resizeRatio;
    var pixelRatio = ignoreRetina ? 1 : Graffiti.pixelRatio;
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
    var pixelRatio = ignoreRetina ? 1 : Graffiti.pixelRatio;
    return brushSize * (ratio ? ratio : Graffiti.resizeRatio) * pixelRatio;
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
    Graffiti.history.push([strokes, brush, resizeRatio]);
    Graffiti.historyGlobal.push([strokes, brush, resizeRatio]);
    if(Graffiti.history.length == Graffiti.historyLimit * 2) {
      var data = Graffiti.drawAreaGetData();
      var checkPointStrokes = Graffiti.history.splice(0, Graffiti.historyLimit);
      Graffiti.historyDrawToCanvas(checkPointStrokes, function() {
        Graffiti.historyCheckpoint = Graffiti.drawAreaHistoryCanvas.toDataURL("image/png", 1);
        Graffiti.drawAreaHistoryContext.clearRect(0, 0, data[4], data[5]);
      });
    }
  },

  historyDrawToCanvas: function(strokes, callback) {
    var data = Graffiti.drawAreaGetData();
    if(Graffiti.historyCheckpoint) {
      var image = new Image();
      image.onload = function() {
        Graffiti.drawAreaHistoryContext.drawImage(image, 0, 0, data[4], data[5]);
        resolveAsynch();
      }
      image.src = Graffiti.historyCheckpoint;
    } else {
      resolveAsynch();
    }
    function resolveAsynch() {
      Graffiti.draw(Graffiti.drawAreaHistoryContext, strokes, Graffiti.maxResizeRatio);
      callback();
    }
  },

  historyStepBack: function() {
    if(Graffiti.historyStepBackLock) {
      return false;
    }
    var data = Graffiti.drawAreaGetData();
    if(Graffiti.history.length == 0) {
      Graffiti.drawAreaErase();
      Graffiti.historyCheckpoint = null;
    } else {
      Graffiti.historyStepBackLock = 1;
      Graffiti.history.pop();
      Graffiti.historyGlobal.pop();
      Graffiti.drawAreaStrokeContext.drawImage(Graffiti.drawAreaMainCanvas, 0, 0, data[2], data[3]);
      Graffiti.drawAreaStrokeCanvas.style.backgroundColor = "#ffffff";
      Graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
      if(Graffiti.historyCheckpoint) {
        var image = new Image();
        image.onload = function() {
          Graffiti.drawAreaMainContext.drawImage(image, 0, 0, data[2], data[3]);
          resolveAsynch();
        }
        image.src = Graffiti.historyCheckpoint;
      } else {
        resolveAsynch();
      }
    }
    function resolveAsynch() {
      Graffiti.draw(Graffiti.drawAreaMainContext, Graffiti.history);
      animate(Graffiti.drawAreaStrokeCanvas, { opacity : 0 }, 200, function() {
        Graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
        Graffiti.drawAreaStrokeCanvas.style.backgroundColor = "transparent";
        Graffiti.drawAreaStrokeCanvas.style.opacity = "1";
        Graffiti.historyStepBackLock = 0;
      });
    }
  },

  drawAreaGetData: function() {
    return [
            parseInt(Graffiti.drawAreaWrap.style.width),
            parseInt(Graffiti.drawAreaWrap.style.height),
            Graffiti.drawAreaMainCanvas.width,
            Graffiti.drawAreaMainCanvas.height,
            Graffiti.drawAreaMaxWidth * Graffiti.pixelRatio,
            Graffiti.drawAreaMaxHeight * Graffiti.pixelRatio
           ];
  },

  // resize

  resizing: 0,

  resize: function(event) {
    if(Graffiti.resizing) {
      var canvasHeight = parseInt(Graffiti.drawAreaWrap.style.height);
      var resizerY = getXY(ge(Graffiti.resizer))[1];
      var newHeight = canvasHeight + event.pageY - resizerY;
      var newWidth = Graffiti.drawAreaMinWidth / Graffiti.drawAreaMinHeight * newHeight;
      if(newHeight < Graffiti.drawAreaMinHeight) newHeight = Graffiti.drawAreaMinHeight;
      if(newWidth < Graffiti.drawAreaMinWidth) newWidth = Graffiti.drawAreaMinWidth;
      if(newHeight > Graffiti.drawAreaMaxHeight) newHeight = Graffiti.drawAreaMaxHeight;
      if(newWidth > Graffiti.drawAreaMaxWidth) newWidth = Graffiti.drawAreaMaxWidth;
      Graffiti.drawAreaWrap.style.height = newHeight + "px";
      Graffiti.drawAreaWrap.style.width = newWidth + "px";
      // remove in production
     // ge("popup_wrap").style.width = (newWidth + 22) + "px";
      if (Graffiti.onResize) {
        Graffiti.onResize(newWidth, newHeight);
      }
      // /remove in production
      Graffiti.drawAreaMainCanvas.style.width = newWidth + "px";
      Graffiti.drawAreaMainCanvas.style.height = newHeight + "px";
      Graffiti.drawAreaStrokeCanvas.style.width = newWidth + "px";
      Graffiti.drawAreaStrokeCanvas.style.height = newHeight + "px";
      Graffiti.drawAreaCurWidth = newWidth;
      Graffiti.drawAreaCurHeight = newHeight;
    }
  },

  resizeBegin: function() {
    Graffiti.resizing = 1;
  },

  resizeFinish: function() {
    if(Graffiti.resizing) {
      Graffiti.resizing = 0;
      Graffiti.drawAreaStrokeCanvas.style.top = "-" + Graffiti.drawAreaCurHeight + "px";
      Graffiti.drawAreaUpdateOffset();
      Graffiti.resizeRatio = Graffiti.drawAreaCurWidth / Graffiti.drawAreaMinWidth;
      Graffiti.drawAreaUpdateSize();
      if(Graffiti.historyCheckpoint) {
        var image = new Image();
        image.onload = function() {
          var data = Graffiti.drawAreaGetData();
          Graffiti.drawAreaMainContext.drawImage(image, 0, 0, data[2], data[3]);
          resolveAsynch();
        }
        image.src = Graffiti.historyCheckpoint;
      } else {
        resolveAsynch();
      }
      function resolveAsynch() {
        Graffiti.draw(Graffiti.drawAreaMainContext, Graffiti.history);
      }
    }
  },

  // export

  exportLock: 0,

  exportSvg: function() {
    if(Graffiti.historyGlobal.length == 0) return false;
    Graffiti.exportLock = 1;
    var history = Graffiti.historyGlobal.slice();
    var maxW = Graffiti.drawAreaMaxWidth;
    var maxH = Graffiti.drawAreaMaxHeight;
    var file = '<?xml version="1.0" standalone="yes"?>\
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"> \
<svg width="' + maxW + 'px" height="' + maxH + 'px" viewBox="0 0 ' + maxW + ' ' + maxH + '" xmlns="http://www.w3.org/2000/svg" version="1.1">';
    for(var i = 0; i < history.length; i++) {
      file += Graffiti.exportSvgGetChunk(history[i]);
    }
    file += '</svg>';
    return file;
  },

  exportSvgGetChunk: function(step) {
    var chunk = '<path d="';
    var strokes = Graffiti.drawGetNormalizedStrokes(step[0], step[2], Graffiti.maxResizeRatio, true);
    var size = Graffiti.drawGetNormalizedBrushSize(step[1][0], Graffiti.maxResizeRatio, true);
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
    Graffiti.historyDrawToCanvas(Graffiti.history, function() {
      callback(Graffiti.drawAreaHistoryCanvas.toDataURL("image/png", 1));
    });
  },

  // shortcuts

  shortCutHandle: function(event) {
    if(event.shiftKey) {
      switch(event.keyCode) {
        // ctrl + z
        case 90:
          Graffiti.historyStepBack();
        break;
        // ctrl + e (erase)
        case 78:
          Graffiti.drawAreaErase();
        break;
      }
    }
  }

};

try{stManager.done('graffiti_new.js');}catch(e){}