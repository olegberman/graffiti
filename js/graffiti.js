var graffiti = {

  brush: [20, "95, 127, 162", 1], // size, rgb color, opacity
  strokes: [],

  brushPreviewCanvas: undefined,
  brushPreviewContext: undefined,
  colorPickerWrap: undefined,
  colorPicker: undefined,
  colorPickerActiveCell: undefined,
  drawAreaCanvas: undefined,
  drawAreaContext: undefined,
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
      //console.log(event);
      graffiti.sliderMouseMove(event);
      graffiti.drawAreaEventPool(event);
    }, false);
    document.addEventListener("mouseup", function() {
      graffiti.sliderMouseUp();
      graffiti.drawAreaFinishStroke();
    }, false);
  },

  normalizeCanvasRatios: function(canvas, context) {
    var w = canvas.width;
    var h = canvas.height;
    var ratio = window.devicePixelRatio;
    canvas.width *= ratio;
    canvas.height *= ratio;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    context.scale(ratio, ratio);
  },

  // brush preview

  brushPreviewInit: function() {
    graffiti.brushPreviewCanvas = ge("graffiti_brush_canvas");
    graffiti.brushPreviewContext = graffiti.brushPreviewCanvas.getContext("2d");
    graffiti.normalizeCanvasRatios(graffiti.brushPreviewCanvas, graffiti.brushPreviewContext);
    graffiti.brushPreviewUpdate();
  },

  brushPreviewUpdate: function() {
    var ctx = graffiti.brushPreviewContext;
    ctx.clearRect(0, 0, 80, 80);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = graffiti.brush[0];
    ctx.strokeStyle = "rgba(" + graffiti.brush[1] + ", " + graffiti.brush[2] + ")";
    console.log("rgba(" + graffiti.brush[1] + ", " + graffiti.brush[2] + ")");
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
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    graffiti.colorPickerWrap.style.left = position[0] - 50 + "px";
    graffiti.colorPickerWrap.style.top = position[1] + 30 + "px";
    var html = "";
    var colors = [];
    for(var r = 0; r < 6; r++) {
      for(var g = 0; g < 6; g++) {
        for(var b = 0; b < 6; b++) {
          colors[r * 36 + g * 6 + b] = "rgb(" + (r / 5 * 255) + "," + (g / 5 * 255) + "," + (b / 5 * 255) + ")";
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
      animate(graffiti.colorPickerWrap, { opacity: 1, top: position[1] - 230 }, 100);
      graffiti.colorPickerOpened = 1;
    } else {
      graffiti.colorPickerHide();
    }
  },

  colorPickerHide: function() {
    var position = getXY(ge("graffiti_colorpreview_wrap"));
    animate(graffiti.colorPickerWrap, { opacity: 0, top: position[1] + 30 }, 100, function() {
      graffiti.colorPickerWrap.style.display = "none";
    });
    graffiti.colorPickerOpened = 0;
  },

  colorPickerHighlight: function(target) {
    if(graffiti.colorPickerOpened == 1) {
      graffiti.colorPickerLastHighlight = target.style.backgroundColor.replace(/(rgb\(|\))/g, "");
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
    graffiti.brushPreviewUpdate();
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
    var slider = isEmpty(graffiti.sliderActive) ? graffiti.sliderHovered : graffiti.sliderActive;
    var width = getSize(slider.wrapper)[0] - 5;
    if(event.type == "wheel" || event.type == "DOMMouseScroll") {
      var delta = (event.detail < 0 || event.wheelDelta > 0) ? -5 : 5;
      pixelPosition = (width / 100 * slider.value) + delta;
    } else {
      pixelPosition = event.clientX - getXY(slider.wrapper)[0];
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
    graffiti.drawAreaCanvas = ge("graffiti_drawarea_canvas");
    graffiti.drawAreaContext = graffiti.drawAreaCanvas.getContext("2d");
    graffiti.drawAreaWrapOffset = getXY(graffiti.drawAreaWrap);
  },

  drawAreaEventPool: function(event) {
    if(graffiti.drawAreaInUse == 1) {
      switch(event.type) {
        case "mousemove":
          var xy = getXY(graffiti.drawAreaWrap);
          graffiti.strokes.push([event.clientX - xy[0], event.clientY - xy[1]]);
          console.log([event.clientX - xy[0], event.clientY - xy[1]]);
          graffiti.drawAreaDraw();
        break;
      }
    }
  },

  drawAreaDraw: function() {
    var ctx = graffiti.drawAreaContext;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = graffiti.brush[0];
    ctx.strokeStyle = "rgba(" + graffiti.brush[1] + ", " + graffiti.brush[2] + ")";
    ctx.beginPath();
    console.log(graffiti.strokes);
    if(graffiti.strokes.length > 2) {
      var st1 = graffiti.strokes.shift();
      ctx.moveTo(st1[0], st1[1]);
      var st2 = graffiti.strokes.shift();
      ctx.lineTo(st2[0], st2[1]);
      ctx.closePath();
      ctx.stroke();
    }
  },

  drawAreaBeginStroke: function(event) {
    graffiti.drawAreaInUse = 1;
    graffiti.strokes.push([]);
  },

  drawAreaFinishStroke: function() {
    if(graffiti.drawAreaInUse == 1) {
      graffiti.drawAreaInUse = 0;
    }
  }


};

document.addEventListener("DOMContentLoaded", function() {
  graffiti.init();
}, false);