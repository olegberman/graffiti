var graffiti = {

  brush: [20, "95, 127, 162", 1], // size, rgb color, opacity
  strokes: [],
  drawAreaMaxWidth: 1240,
  drawAreaMaxHeight: 620,
  historyLimit: 50,

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
  drawAreaWrap: undefined,

  init: function() {
    graffiti.attachEvents();
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
  },

  attachEvents: function() {
    document.addEventListener("mousemove", function() {
      event.preventDefault();
      graffiti.sliderMouseMove(event);
      graffiti.drawAreaAdvanceStroke(event);
    }, false);
    document.addEventListener("mouseup", function() {
      graffiti.sliderMouseUp();
      graffiti.drawAreaFinishStroke();
    }, false);
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
    ctx.clearRect(0, 0, 80, 80);
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
      animate(graffiti.colorPickerWrap, { opacity: 1, 
                                          top: position[1] - 230 },
                                          100);
      graffiti.colorPickerOpened = 1;
    } else {
      graffiti.colorPickerHide();
    }
  },

  colorPickerHide: function() {
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    graffiti.colorPickerActiveCell.style.display = "none";
    animate(graffiti.colorPickerWrap, { opacity: 0, 
                                        top: position[1] + 30 }, 
                                        100,
    function() {
      graffiti.colorPickerWrap.style.display = "none";
    });
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
    animate(graffiti.sliders[id].thumb, {left : pixelPosition + "px"}, 300);
    wrapper.addEventListener("wheel", graffiti.sliderWheel, false);
    wrapper.addEventListener("DOMMouseScroll", graffiti.sliderWheel, false);
    graffiti.sliderUpdated(id);
  },

  sliderMouseDown: function(id, event) {
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
        graffiti.brush[0] = (thickness < 0) ? 1 : thickness;
        graffiti.brushPreviewUpdate();
      break;
      case "opacity":
        var opacity = graffiti.sliders[id].value / 100;
        graffiti.brush[2] = (opacity < 0) ? 0.01 : opacity;
        graffiti.brushPreviewUpdate();
      break;
    }
  },

  // draw area

  drawAreaInUse: 0,

  drawAreaWrapOffset: [], // recalculate offset method?

  drawAreaInit: function() {
    graffiti.drawAreaWrap = ge("graffiti_drawarea_wrap");
    graffiti.drawAreaMainCanvas = ge("graffiti_canvas_main");
    graffiti.drawAreaMainContext = graffiti.drawAreaMainCanvas.getContext("2d");
    graffiti.drawAreaStrokeCanvas = ge("graffiti_canvas_stroke");
    graffiti.drawAreaStrokeContext = graffiti.drawAreaStrokeCanvas.getContext("2d");
    graffiti.drawAreaMainContext.scale(2, 2);
    graffiti.drawAreaStrokeContext.scale(2, 2);
    graffiti.drawAreaWrapOffset = getXY(graffiti.drawAreaWrap);
  },

  drawAreaBeginStroke: function(event) {
    var pos = graffiti.drawAreaWrapOffset;
    graffiti.strokes.push([event.pageX - pos[0], event.pageY - pos[1]]);
    graffiti.drawAreaInUse = 1;
    graffiti.draw(graffiti.drawAreaStrokeContext);
  },

  drawAreaAdvanceStroke: function(event) {
    if(graffiti.drawAreaInUse == 1) {
      var maxW = graffiti.drawAreaMaxWidth;
      var maxH = graffiti.drawAreaMaxHeight;
      graffiti.drawAreaStrokeContext.clearRect(0, 0, maxW, maxH);
      var pos = graffiti.drawAreaWrapOffset;
      graffiti.strokes.push([event.pageX - pos[0], event.pageY - pos[1]]);
      graffiti.draw(graffiti.drawAreaStrokeContext);
    }
  },

  drawAreaFinishStroke: function() {
    if(graffiti.drawAreaInUse == 1) {
      var data = graffiti.canvasCloneGetData();
      graffiti.drawAreaInUse = 0;
      graffiti.draw(graffiti.drawAreaMainContext);
      graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
      graffiti.historyAddStep(graffiti.strokes, graffiti.brush);
      graffiti.strokes = [];
    }
  },

  drawAreaErase: function() {
    var data = graffiti.canvasCloneGetData();
    graffiti.drawAreaStrokeContext.drawImage(graffiti.drawAreaMainCanvas, 0, 0, data[0], data[1]);
    graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
    animate(graffiti.drawAreaStrokeCanvas, {opacity: 0}, 200, function() {
      graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
      graffiti.drawAreaStrokeCanvas.style.opacity = "1";
    });
    // history flush here
  },

  // draw

  draw: function(ctx, history) {
    var strokes = undefined;
    var recursive = false;
    if(history) {
      if(history.length != 0) {
        var step = history.pop();
        strokes = step[0];
        recursive = true;
      } else {
        return false;
      }
      ctx.lineWidth = step[1][0];
      ctx.strokeStyle = "rgba(" + step[1][1] + ", " + step[1][2] + ")";
    } else {
      strokes = graffiti.strokes;
      ctx.lineWidth = graffiti.brush[0];
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
    if(recursive) graffiti.draw(ctx, history);
  },

  // history

  history: [],
  historyCheckpoint: undefined,

  historyAddStep: function(strokes, brush) {
    graffiti.history.push([strokes, brush]);
    if(graffiti.history.length == graffiti.historyLimit) {
      graffiti.historyCheckpoint = graffiti.drawAreaMainCanvas.toDataURL("image/png", 1);
    }
    if(graffiti.history.length == graffiti.historyLimit * 2) {
      if(graffiti.historyCheckpoint) {
        var image = new Image();
        image.onload = function() {
          var data = graffiti.canvasCloneGetData();
          graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
          graffiti.drawAreaMainContext.drawImage(image, 0, 0, data[0], data[1]);
          graffiti.history.splice(0, graffiti.historyLimit);
          graffiti.draw(graffiti.drawAreaMainContext, graffiti.history);
        }
        image.src = graffiti.historyCheckpoint;
      }
    }
  },

  historyStepBack: function() {
    var data = graffiti.canvasCloneGetData();
    if(history.length == 0) {
      if(!graffiti.historyCheckpoint) return false;
      var image = new Image();
      image.onload = function() {
        graffiti.drawAreaStrokeContext.drawImage(graffiti.drawAreaMainCanvas, 0, 0, data[0], data[1]);
        graffiti.drawAreaMainContext.drawImage(image, 0, 0, data[0], data[1]);
        animate(graffiti.drawAreaStrokeCanvas, { opacity : 0 }, 200, function() {
          graffiti.drawAreaStrokeCanvas.clearRect(0, 0, data[2], data[3]);
          graffiti.drawAreaStrokeCanvas.style.opacity = "1";
          graffiti.historyCheckpoint = undefined;
        });
      }
      image.src = graffiti.historyCheckpoint;
    } else {
      graffiti.history.pop();
      graffiti.drawAreaStrokeContext.drawImage(graffiti.drawAreaMainCanvas, 0, 0, data[0], data[1]);
      graffiti.drawAreaMainContext.clearRect(0, 0, data[2], data[3]);
      graffiti.draw(graffiti.drawAreaMainContext, graffiti.history);
      animate(graffiti.drawAreaStrokeCanvas, { opacity : 0 }, 200, function() {
        graffiti.drawAreaStrokeContext.clearRect(0, 0, data[2], data[3]);
        graffiti.drawAreaStrokeCanvas.style.opacity = "1";
      });
    }
  },

  canvasCloneGetData: function() {
    return [
            parseInt(graffiti.drawAreaWrap.style.width),
            parseInt(graffiti.drawAreaWrap.style.height),
            graffiti.drawAreaMaxWidth,
            graffiti.drawAreaMaxHeight
           ];
  }

};

document.addEventListener("DOMContentLoaded", function() {
  graffiti.init();
}, false);