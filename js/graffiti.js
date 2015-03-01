var graffiti = {

  brush: [20, "95, 127, 162", 1], // size, rgb color, opacity

  brushPreviewCanvas: undefined,
  brushPreviewContext: undefined,
  colorPickerCanvas: undefined,
  colorPickerContext: undefined,

  init: function() {
    graffiti.attachEvents();
    graffiti.colorPickerInit();
    graffiti.brushPreviewInit();
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
    }, false);
    document.addEventListener("mouseup", function() {
      graffiti.sliderMouseUp();
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

  colorPickerInit: function() {
    /*graffiti.colorPickerCanvas = ge("graffiti_colorpicker_canvas");
    graffiti.colorPickerContext = graffiti.colorPickerCanvas.getContext("2d");
    var ctx = graffiti.colorPickerContext;*/

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
  }

};

document.addEventListener("DOMContentLoaded", function() {
  graffiti.init();
}, false);