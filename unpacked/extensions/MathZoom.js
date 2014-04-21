/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/MathZoom.js
 *
 *  Implements the zoom feature for enlarging math expressions.  It is
 *  loaded automatically when the Zoom menu selection changes from "None".
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2010-2013 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (HUB,HTML,AJAX,HTMLCSS,nMML) {
  var VERSION = "2.3-pmc";

  var CONFIG = HUB.CombineConfig("MathZoom",{
    styles: {
      //
      //  The styles for the MathZoom display box
      //
      "#MathJax_Zoom": {
        position:"absolute", "background-color":"#F0F0F0", overflow:"auto",
        display:"block", "z-index":301, padding:".5em", border:"1px solid black", margin:0,
        "font-weight":"normal", "font-style":"normal",
        "text-align":"left", "text-indent":0, "text-transform":"none",
        "line-height":"normal", "letter-spacing":"normal", "word-spacing":"normal",
        "word-wrap":"normal", "white-space":"nowrap", "float":"none",
        "box-shadow":"5px 5px 15px #AAAAAA",         // Opera 10.5 and IE9
        "-webkit-box-shadow":"5px 5px 15px #AAAAAA", // Safari 3 and Chrome
        "-moz-box-shadow":"5px 5px 15px #AAAAAA",    // Forefox 3.5
        "-khtml-box-shadow":"5px 5px 15px #AAAAAA",  // Konqueror
        filter: "progid:DXImageTransform.Microsoft.dropshadow(OffX=2, OffY=2, Color='gray', Positive='true')" // IE
      },

      //
      //  The styles for the hidden overlay (should not need to be adjusted by the page author)
      //
      "#MathJax_ZoomOverlay": {
        position:"absolute", left:0, top:0, "z-index":300, display:"inline-block",
        width:"100%", height:"100%", border:0, padding:0, margin:0,
        "background-color":"white", opacity:0, filter:"alpha(opacity=0)"
      },

      "#MathJax_ZoomFrame": {
        position:"relative", display:"inline-block",
        height:0, width:0
      },

      "#MathJax_ZoomEventTrap": {
        position:"absolute", left:0, top:0, "z-index":302,
        display:"inline-block", border:0, padding:0, margin:0,
        "background-color":"white", opacity:0, filter:"alpha(opacity=0)"
      }
    },
    bodyDiv: false
  });

  var FALSE, HOVER, EVENT;
  MathJax.Hub.Register.StartupHook("MathEvents Ready",function () {
    EVENT = MathJax.Extension.MathEvents.Event;
    FALSE = MathJax.Extension.MathEvents.Event.False;
    HOVER = MathJax.Extension.MathEvents.Hover;
  });

  /*************************************************************/

  var ZOOM = MathJax.Extension.MathZoom = {
    version: VERSION,
    settings: HUB.config.menuSettings,
    scrollSize: 18,    // width of scroll bars

    //
    //  Process events passed from output jax
    //
    HandleEvent: function (event,type,math) {
      if (ZOOM.settings.CTRL  && !event.ctrlKey)  return true;
      if (ZOOM.settings.ALT   && !event.altKey)   return true;
      if (ZOOM.settings.CMD   && !event.metaKey)  return true;
      if (ZOOM.settings.Shift && !event.shiftKey) return true;
      if (!ZOOM[type]) return true;
      return ZOOM[type](event,math);
    },

    //
    //  Zoom on click
    //
    Click: function (event,math) {
      if (this.settings.zoom === "Click") {return this.Zoom(event,math)}
    },

    //
    //  Zoom on double click
    //
    DblClick: function (event,math) {
      if (this.settings.zoom === "Double-Click" || this.settings.zoom === "DoubleClick") {return this.Zoom(event,math)}
    },

    //
    //  Zoom on hover (called by MathEvents.Hover)
    //
    Hover: function (event,math) {
      if (this.settings.zoom === "Hover") {this.Zoom(event,math); return true}
      return false;
    },


    //
    //  Handle the actual zooming
    //
    Zoom: function (event,math) {
      //
      //  Remove any other zoom and clear timers
      //
      this.Remove(); HOVER.ClearHoverTimer(); EVENT.ClearSelection();

      //
      //  Find the jax
      //
      var JAX = MathJax.OutputJax[math.jaxID];
      var jax = JAX.getJaxFromMath(math);
      if (jax.hover) {HOVER.UnHover(jax)}

      //
      //  Create the DOM elements for the zoom box
      //
      var Mw = Math.floor(document.body.clientWidth - 100),
          Mh = Math.floor(Math.max(document.body.clientHeight, document.documentElement.clientHeight) - 100);
      var div = HTML.Element(
        "span", 
        { id: "MathJax_ZoomFrame" }, 
        [ [ "span", 
            { id: "MathJax_ZoomOverlay", 
              onmousedown: this.Remove }
          ],
          [ "span", 
            { id: "MathJax_Zoom", 
              onclick: this.Remove,
              style: {
                visibility: "hidden",
                fontSize: this.settings.zscale,
                "max-width": Mw+"px", 
                "max-height": Mh+"px"
              }
            }, 
            [ [ "span",
                { style: 
                  { "white-space": "nowrap" }
                }
              ]
            ]
          ]
        ]
      );
      var zoom = div.lastChild, 
          span = zoom.firstChild, 
          overlay = div.firstChild;

      // [klortho] With new configuration option bodyDiv, we'll put the zoom frame in a 
      // special place, as the last child of the body.
      if (CONFIG.bodyDiv) {
        // Set an attribute on the ZoomFrame that let's us find our way back to the 
        // original equation
        div.setAttribute("data-mathdiv-id", math.getAttribute("id"));
        div.style.position = "absolute";
        this.WrapperDiv().appendChild(div);
      }
      else {
        // default
        math.parentNode.insertBefore(div,math);
        math.parentNode.insertBefore(math,div); // put div after math
      }


      if (span.addEventListener) {span.addEventListener("mousedown",this.Remove,true)}

      if (this.msieTrapEventBug) {
        var trap = HTML.Element("span",{id:"MathJax_ZoomEventTrap", onmousedown:this.Remove});
        div.insertBefore(trap,zoom);
      }

      //
      //  Display the zoomed math
      //
      if (this.msieZIndexBug) {
        //  MSIE doesn't do z-index properly, so move the div to the document.body,
        //  and use an image as a tracker for the usual position
        var tracker = HTML.addElement(document.body,"img",{
          src:"about:blank", id:"MathJax_ZoomTracker", width:0, height:0,
          style:{width:0, height:0, position:"relative"}
        });

        div.style.zIndex = CONFIG.styles["#MathJax_ZoomOverlay"]["z-index"];
        div = tracker;
      }

      var bbox = JAX.Zoom(jax,span,math,Mw,Mh);  // Mw, Mh => max width, height
      var $ = jQuery;
      $(span).css('display', 'inline');


      //
      //  Fix up size and position for browsers with bugs (IE)
      //
      if (this.msiePositionBug) {
        if (this.msieSizeBug)
          {zoom.style.height = bbox.zH+"px"; zoom.style.width = bbox.zW+"px"} // IE8 gets the dimensions completely wrong
        if (zoom.offsetHeight > Mh) {zoom.style.height = Mh+"px"; zoom.style.width = (bbox.zW+this.scrollSize)+"px"}  // IE doesn't do max-height?
        if (zoom.offsetWidth  > Mw) {zoom.style.width  = Mw+"px"; zoom.style.height = (bbox.zH+this.scrollSize)+"px"}
      }
      if (this.operaPositionBug) {zoom.style.width = Math.min(Mw,bbox.zW)+"px"}  // Opera gets width as 0?

      // [klortho]
      // Chrome (webkit) with SVG: #749: if width is just padding+border, but there's
      // an svg child with non-zero width, assume it's this bug
      var svg = zoom.getElementsByTagName('svg')[0];
      if (svg && (MathJax.Hub.Browser.isChrome || MathJax.Hub.Browser.isSafari)) {
        var zcs = window.getComputedStyle(zoom),
            zbp = parseInt(zcs.getPropertyValue("border-left-width")) +
                  parseInt(zcs.getPropertyValue("padding-left")) +
                  parseInt(zcs.getPropertyValue("padding-right")) +
                  parseInt(zcs.getPropertyValue("border-right-width"));
        if (zoom.offsetWidth == zbp) { // looks like the bug
          zoom.style.width = svg.offsetWidth + "px";
        }
        
      }

      // [klortho] Commenting out the following lines causes some spurious scrollbars to
      // appear sometimes.  But the alternative is worse, often scrollbars don't show up
      // where they should.  Compromise:  added "* 0.9".
      if (zoom.offsetWidth && zoom.offsetWidth < Mw * 0.9 && zoom.offsetHeight < Mh * 0.9)
         {zoom.style.overflow = "visible"}  // don't show scroll bars if we don't need to
      
      this.Position(zoom,bbox, math);
      if (this.msieTrapEventBug) {
        trap.style.height = zoom.clientHeight+"px"; trap.style.width = zoom.clientWidth+"px";
        trap.style.left = (parseFloat(zoom.style.left)+zoom.clientLeft)+"px";
        trap.style.top = (parseFloat(zoom.style.top)+zoom.clientTop)+"px";
      }
      zoom.style.visibility = "";

      //
      //  Add event handlers
      //
      if (this.settings.zoom === "Hover") {overlay.onmouseover = this.Remove}
      if (window.addEventListener) {addEventListener("resize",this.Resize,false)}
      else if (window.attachEvent) {attachEvent("onresize",this.Resize)}
      else {this.onresize = window.onresize; window.onresize = this.Resize}

      //
      //  Let others know about the zoomed math
      //
      HUB.signal.Post(["math zoomed",jax]);

      //
      //  Cancel further actions
      //
      return FALSE(event);
    },

    // [klortho] Only used when bodyDiv is true.
    WrapperDiv: function() {
      var wrapper_id = "MathJax_ZoomWrapper";

      if (!this.hasOwnProperty("wrapperDiv")) {
        // See if one already exists in the DOM
        var wd = document.getElementById(wrapper_id);
        if (!wd) {
          // Create a new wrapper div
          wd = HTML.Element("div", {
            id: "MathJax_ZoomWrapper",
            style: {
              position: "absolute",
              top: "0px",
              left: "0px"
            }
          });
          if (!document.body.firstChild) {
            document.body.appendChild(wd)
          }
          else {
            // Insert as the last div in the body.
            document.body.insertBefore(wd, null)
          }
        }
        this.wrapperDiv = wd;
      }
      return this.wrapperDiv;
    },


    //
    //  Set the position of the zoom box and overlay
    //
    Position: function (zoom,bbox, math) {
      var XY = this.Resize(), x = XY.x, y = XY.y, W = bbox.mW;

      var dx = -W-Math.floor((zoom.offsetWidth-W)/2), dy = bbox.Y;

      // [klortho] Here is where we want to inject the new position
      if (!CONFIG.bodyDiv) {
        zoom.style.left = Math.max(dx,10-x)+"px";
        zoom.style.top = Math.max(dy,10-y)+"px";
        console.info("left: " + zoom.style.left + ", top: " + zoom.style.top);
      }
      else {
        var $ = jQuery;
        var $math = $(math),
            math_offset = $math.offset(),
            math_left = math_offset.left,
            math_center_x = math_left + Math.floor(bbox.mW / 2),
            zoom_left_w = math_center_x - Math.floor(zoom.offsetWidth / 2),
            client_width = document.body.clientWidth,
            margin_x = Math.floor(Math.min(10, (client_width - zoom.offsetWidth) / 2)),
            max_left = client_width - margin_x - zoom.offsetWidth,
            zoom_left = Math.min(Math.max(zoom_left_w, margin_x), max_left);
        zoom.style.left = zoom_left + "px";

        // Can't seem to trust bbox.mH
        var mspan = $math.find('span.math');
        var math_top = mspan.length ? Math.min(math_offset.top, mspan.offset().top) 
                                    : math_offset.top;
        var math_height = mspan.length ? Math.max(bbox.mH, mspan.height())
                                       : bbox.mH;
        var math_center_y = math_top + Math.floor(math_height / 2),
            zoom_top_w  = math_center_y - Math.floor(zoom.offsetHeight / 2),
            viewport_top = $(document).scrollTop(),
            viewport_height = $(window).height(),
            margin_y = Math.floor(Math.min(10, (viewport_height - zoom.offsetHeight) / 2)),
            max_top = viewport_top + viewport_height - margin_y - zoom.offsetHeight,
            zoom_top = Math.min(Math.max(zoom_top_w, viewport_top + margin_y), max_top);
        zoom.style.top  = zoom_top + "px";
      }

      if (!ZOOM.msiePositionBug) {ZOOM.SetWH()} // refigure overlay width/height
    },

    //
    //  Handle resizing of overlay while zoom is displayed
    //
    Resize: function (event) {
      if (ZOOM.onresize) {ZOOM.onresize(event)}
      var div = document.getElementById("MathJax_ZoomFrame"),
          overlay = document.getElementById("MathJax_ZoomOverlay");
      var xy = ZOOM.getXY(div);
      var obj = div.parentNode, overflow = ZOOM.getOverflow(obj);
      while (obj.parentNode && obj !== document.body && overflow === "visible") {
        obj = obj.parentNode
        overflow = ZOOM.getOverflow(obj);
      }
      if (overflow !== "visible") {
        overlay.scroll_parent = obj;  // Save this for future reference.
        var XY = ZOOM.getXY(obj);     // Remove container position
        xy.x -= XY.x; xy.y -= XY.y;
        XY = ZOOM.getBorder(obj);     // Remove container border
        xy.x -= XY.x; xy.y -= XY.y;
      }
      overlay.style.left = (-xy.x)+"px"; overlay.style.top = (-xy.y)+"px";
      if (ZOOM.msiePositionBug) {setTimeout(ZOOM.SetWH,0)} else {ZOOM.SetWH()}
      return xy;
    },
    SetWH: function () {
      var overlay = document.getElementById("MathJax_ZoomOverlay");
      overlay.style.width = overlay.style.height = "1px"; // so scrollWidth/Height will be right below
      var doc = overlay.scroll_parent || document.documentElement || document.body;
      overlay.style.width = doc.scrollWidth + "px";
      overlay.style.height = Math.max(doc.clientHeight,doc.scrollHeight) + "px";
    },
    //
    //  Look up CSS properties (use getComputeStyle if available, or currentStyle if not)
    //
    getOverflow: (window.getComputedStyle ?
      function (obj) {return getComputedStyle(obj).overflow} :
      function (obj) {return (obj.currentStyle||{overflow:"visible"}).overflow}),
    getBorder: function (obj) {
      var size = {thin: 1, medium: 2, thick: 3};
      var style = (window.getComputedStyle ? getComputedStyle(obj) :
                     (obj.currentStyle || {borderLeftWidth:0,borderTopWidth:0}));
      var x = style.borderLeftWidth, y = style.borderTopWidth;
      if (size[x]) {x = size[x]} else {x = parseInt(x)}
      if (size[y]) {y = size[y]} else {y = parseInt(y)}
      return {x:x, y:y};
    },
    //
    //  Get the position of an element on the page
    //
    getXY: function (div) {
      var x = 0, y = 0, obj;
      obj = div; while (obj.offsetParent) {x += obj.offsetLeft; obj = obj.offsetParent}
      if (ZOOM.operaPositionBug) {div.style.border = "1px solid"}  // to get vertical position right
      obj = div; while (obj.offsetParent) {y += obj.offsetTop; obj = obj.offsetParent}
      if (ZOOM.operaPositionBug) {div.style.border = ""}
      return {x:x, y:y};
    },

    //
    //  Remove zoom display and event handlers
    //
    Remove: function (event) {
      var div = document.getElementById("MathJax_ZoomFrame");
      if (div) {

        // [klortho] Fix how we get the math div and its corresponding jax
        if (!CONFIG.bodyDiv) {
          var JAX = MathJax.OutputJax[div.previousSibling.jaxID];
          var jax = JAX.getJaxFromMath(div.previousSibling);
        }
        else {
          var mathdiv_id = div.getAttribute("data-mathdiv-id");
          var mathdiv = document.getElementById(mathdiv_id);
          var JAX = MathJax.OutputJax[mathdiv.jaxID];
          var jax = JAX.getJaxFromMath(mathdiv);
        }

        HUB.signal.Post(["math unzoomed",jax]);
        div.parentNode.removeChild(div);
        div = document.getElementById("MathJax_ZoomTracker");
        if (div) {div.parentNode.removeChild(div)}
        if (ZOOM.operaRefreshBug) {
          // force a redisplay of the page
          // (Opera doesn't refresh properly after the zoom is removed)
          var overlay = HTML.addElement(document.body,"div",{
            style:{position:"fixed", left:0, top:0, width:"100%", height:"100%",
                   backgroundColor:"white", opacity:0},
            id: "MathJax_OperaDiv"
          });
          document.body.removeChild(overlay);
        }
        if (window.removeEventListener) {removeEventListener("resize",ZOOM.Resize,false)}
        else if (window.detachEvent) {detachEvent("onresize",ZOOM.Resize)}
        else {window.onresize = ZOOM.onresize; delete ZOOM.onresize}
      }
      return FALSE(event);
    }

  };


  /*************************************************************/

  HUB.Browser.Select({
    MSIE: function (browser) {
      var mode  = (document.documentMode || 0);
      var isIE9 = (mode >= 9);
      ZOOM.msiePositionBug = !isIE9;
      ZOOM.msieSizeBug = browser.versionAtLeast("7.0") &&
        (!document.documentMode || mode === 7 || mode === 8);
      ZOOM.msieZIndexBug = (mode <= 7);
      ZOOM.msieInlineBlockAlignBug = (mode <= 7);
      ZOOM.msieTrapEventBug = !window.addEventListener;
      if (document.compatMode === "BackCompat") {ZOOM.scrollSize = 52} // don't know why this is so far off
      if (isIE9) {delete CONFIG.styles["#MathJax_Zoom"].filter}
    },

    Opera: function (browser) {
      ZOOM.operaPositionBug = true;
      ZOOM.operaRefreshBug = true;
    }
  });

  ZOOM.topImg = (ZOOM.msieInlineBlockAlignBug ?
    HTML.Element("img",{style:{width:0,height:0,position:"relative"},src:"about:blank"}) :
    HTML.Element("span",{style:{width:0,height:0,display:"inline-block"}})
  );
  if (ZOOM.operaPositionBug || ZOOM.msieTopBug) {ZOOM.topImg.style.border="1px solid"}

  /*************************************************************/

  MathJax.Callback.Queue(
    ["StartupHook",MathJax.Hub.Register,"Begin Styles",{}],
    ["Styles",AJAX,CONFIG.styles],
    ["Post",HUB.Startup.signal,"MathZoom Ready"],
    ["loadComplete",AJAX,"[MathJax]/extensions/MathZoom.js"]
  );

})(MathJax.Hub,MathJax.HTML,MathJax.Ajax,MathJax.OutputJax["HTML-CSS"],MathJax.OutputJax.NativeMML);
