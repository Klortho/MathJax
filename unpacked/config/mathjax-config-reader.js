/*
 * mathjax-config-reader.js
 * MathJax configuration file customized for PMC PubReader.  This starts with the extensions and
 * jax from TeX-AMS-MML_SVG.js, and then adds PMC custom configurations, and also the modules that
 * are specific for TeX have been removed.
 *
 * This is the completely unminified version.
 * The deployed minified version of this, as of 11/6/2014, includes minified versions of the
 * following modules:
 *   /jax/input/MathML/config.js
 *   /jax/output/SVG/config.js
 *   /extensions/mml2jax.js
 *   /extensions/MathEvents.js
 *   /extensions/MathZoom.js (PMC-customized; see PMC-19157)
 *   /extensions/MathMenu.js
 *   /jax/element/mml/jax.js
 *   /extensions/toMathML.js
 *   /jax/input/MathML/jax.js
 *   /jax/output/SVG/jax.js
 *   /jax/output/SVG/autoload/mtable.js
 */

MathJax.Hub.Config({"v1.0-compatible": false});

MathJax.Hub.Config({
  extensions: [
    "mml2jax.js",
    "MathEvents.js",
    "MathZoom.js",
    "MathMenu.js",
    "toMathML.js",
  ],
  jax: [
    "input/MathML",
    "output/SVG"
  ],

  // PMC-specific configuration starts here
  SVG: {
    scale: 90,
    linebreaks: {
        automatic: true,
        width: "container"
    },
    undefinedFamily: "STIXGeneral, 'Cambria Math', 'Arial Unicode MS'"
  },
  showProcessingMessages: false,
  messageStyle: "none",
  menuSettings: {
    zoom: "Click",
    zscale: "100%",
    showRenderer: false  // prevent users accidentally switching to HTML/CSS
  },

  MathMenu: {
    styles: {
      "#MathJax_MenuFrame": {
        "z-index": "1000"
      }
    }
  },
  MathZoom: {
    styles: {
      "#MathJax_ZoomFrame": {
        "z-index": "1000"
      }
    },
    bodyDiv: true
  }
});


MathJax.Ajax.loadComplete("[MathJax]/config/mathjax-config-reader.js");

