/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-2016 Eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

//
// This file has been generated automatically, relevant repositories:
// * https://hg.adblockplus.org/jshydra/
//

"use strict";
if ("ext" in window && document instanceof HTMLDocument) {
  document.addEventListener("click", function (event) {
    if (event.button == 2) {
      return;
    }
    var link = event.target;
    while (!(link instanceof HTMLAnchorElement)) {
      link = link.parentNode;
      if (!link) {
        return;
      }
    }
    if (link.protocol == "http:" || link.protocol == "https:") {
      if (link.host != "subscribe.adblockplus.org" || link.pathname != "/") {
        return;
      }
    }
    else if (!/^abp:\/*subscribe\/*\?/i.test(link.href)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    var params = link.search.substr(1).split("&");
    var title = null;
    var url = null;
    for (var i = 0; i < params.length; i++) {
      var parts = params[i].split("=", 2);
      if (parts.length != 2 || !/\S/.test(parts[1])) {
        continue;
      }
      switch (parts[0]) {
        case "title":
          title = decodeURIComponent(parts[1]);
          break;
        case "location":
          url = decodeURIComponent(parts[1]);
          break;
      }
    }
    if (!url) {
      return;
    }
    if (!title) {
      title = url;
    }
    title = title.trim();
    url = url.trim();
    if (!/^(https?|ftp):/.test(url)) {
      return;
    }
    ext.backgroundPage.sendMessage(
      {
        type: "add-subscription",
        title: title,
        url: url
      });
  }, true);
}
"use strict";
var blockelementPopupId = null;
var currentlyPickingElement = false;
var lastMouseOverEvent = null;
var currentElement = null;
var highlightedElementsSelector = null;
var highlightedElementsInterval = null;
var lastRightClickEvent = null;
var lastRightClickEventIsMostRecent = false;


function getFiltersForElement(element, callback) {
  ext.backgroundPage.sendMessage(
    {
      type: "compose-filters",
      tagName: element.localName,
      id: element.id,
      src: element.getAttribute("src"),
      style: element.getAttribute("style"),
      classes: Array.prototype.slice.call(element.classList),
      urls: getURLsFromElement(element),
      mediatype: typeMap[element.localName],
      baseURL: document.location.href
    }, function (response) {
      callback(response.filters, response.selectors);
    });
}

function getBlockableElementOrAncestor(element, callback) {
  while (element && element != document.documentElement && element != document.body) {
    if (!(element instanceof HTMLElement) || element.localName == "area") {
      element = element.parentElement;
    }
    else if (element.localName == "map") {
      var images = document.querySelectorAll("img[usemap]");
      var image = null;
      for (var i = 0; i < images.length; i++) {
        var usemap = images[i].getAttribute("usemap");
        var index = usemap.indexOf("#");
        if (index != -1 && usemap.substr(index + 1) == element.name) {
          image = images[i];
          break;
        }
      }
      element = image;
    }
    else {
      getFiltersForElement(element, function (filters) {
        if (filters.length > 0) {
          callback(element);
        }
        else {
          getBlockableElementOrAncestor(element.parentElement, callback);
        }
      });
      return;
    }
  }
  callback(null);
}

function addElementOverlay(element) {
  var position = "absolute";
  var offsetX = window.scrollX;
  var offsetY = window.scrollY;
  for (var e = element; e; e = e.parentElement) {
    var style = getComputedStyle(e);
    if (style.display == "none") {
      return null;
    }
    if (style.position == "fixed") {
      position = "fixed";
      offsetX = offsetY = 0;
    }
  }
  var overlay = document.createElement("div");
  overlay.prisoner = element;
  overlay.className = "__adblockplus__overlay";
  overlay.setAttribute("style", "opacity:0.4; display:inline-box; " + "overflow:hidden; box-sizing:border-box;");
  var rect = element.getBoundingClientRect();
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";
  overlay.style.left = rect.left + offsetX + "px";
  overlay.style.top = rect.top + offsetY + "px";
  overlay.style.position = position;
  overlay.style.zIndex = 2147483640;
  document.documentElement.appendChild(overlay);
  return overlay;
}

function highlightElement(element, shadowColor, backgroundColor) {
  backgroundColor = "#009dff";
  unhighlightElement(element);
  var highlightWithOverlay = function () {
    var overlay = addElementOverlay(element);
    if (!overlay) {
      return;
    }
    highlightElement(overlay, shadowColor, backgroundColor);
    overlay.style.pointerEvents = "none";
    element._unhighlight = function () {
      overlay.parentNode.removeChild(overlay);
    };
  };
  var highlightWithStyleAttribute = function () {
    var originalBoxShadow = element.style.getPropertyValue("box-shadow");
    var originalBoxShadowPriority = element.style.getPropertyPriority("box-shadow");
    var originalBackgroundColor = element.style.getPropertyValue("background-color");
    var originalBackgroundColorPriority = element.style.getPropertyPriority("background-color");
    element.style.setProperty("box-shadow", "inset 0px 0px 5px " + shadowColor, "important");
    element.style.setProperty("background-color", backgroundColor, "important");
    element._unhighlight = function () {
      element.style.removeProperty("box-shadow");
      element.style.setProperty("box-shadow", originalBoxShadow, originalBoxShadowPriority);
      element.style.removeProperty("background-color");
      element.style.setProperty("background-color", originalBackgroundColor, originalBackgroundColorPriority);
    };
  };
  if ("prisoner" in element) {
    highlightWithStyleAttribute();
  }
  else {
    highlightWithOverlay();
  }
}

function unhighlightElement(element) {
  if (element && "_unhighlight" in element) {
    element._unhighlight();
    delete element._unhighlight;
  }
}

function highlightElements(selectorString) {
  unhighlightElements();
  var elements = Array.prototype.slice.call(document.querySelectorAll(selectorString));
  highlightedElementsSelector = selectorString;
  highlightedElementsInterval = setInterval(function () {
    if (elements.length > 0) {
      var element = elements.shift();
      if (element != currentElement) {
        highlightElement(element, "#fd6738", "#f6e1e5");
      }
    }
    else {
      clearInterval(highlightedElementsInterval);
      highlightedElementsInterval = null;
    }
  }, 0);
}

function unhighlightElements() {
  if (highlightedElementsInterval) {
    clearInterval(highlightedElementsInterval);
    highlightedElementsInterval = null;
  }
  if (highlightedElementsSelector) {
    Array.prototype.forEach.call(document.querySelectorAll(highlightedElementsSelector), unhighlightElement);
    highlightedElementsSelector = null;
  }
}

function stopEventPropagation(event) {
  event.stopPropagation();
}

function mouseOver(event) {
  lastMouseOverEvent = event;
  getBlockableElementOrAncestor(event.target, function (element) {
    if (event == lastMouseOverEvent) {
      lastMouseOverEvent = null;
      if (currentlyPickingElement) {
        if (currentElement) {
          unhighlightElement(currentElement);
        }
        if (element) {
          highlightElement(element, "#d6d84b", "#f8fa47");
        }
        currentElement = element;
      }
    }
  });
  event.stopPropagation();
}

function mouseOut(event) {

  if (!currentlyPickingElement || currentElement != event.target) {
    return;
  }
  unhighlightElement(currentElement);
  event.stopPropagation();
}

function keyDown(event) {
  if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
    if (event.keyCode == 13) {
      elementPicked(event);
    }
    else if (event.keyCode == 27) {
      deactivateBlockElement();
    }
  }
}

function startPickingElement() {
  currentlyPickingElement = true;

  Array.prototype.forEach.call(document.querySelectorAll("object,embed,iframe,frame"), function (element) {
    getFiltersForElement(element, function (filters) {
      if (filters.length > 0) {
        addElementOverlay(element);
      }
    });
  }.bind(this));
  document.addEventListener("mousedown", stopEventPropagation, true);
  document.addEventListener("mouseup", stopEventPropagation, true);
  document.addEventListener("mouseenter", stopEventPropagation, true);
  document.addEventListener("mouseleave", stopEventPropagation, true);
  document.addEventListener("mouseover", mouseOver, true);
  document.addEventListener("mouseout", mouseOut, true);
  document.addEventListener("click", elementPicked, true);
  document.addEventListener("contextmenu", retFalse, true);
  document.addEventListener("keydown", keyDown, true);
  ext.onExtensionUnloaded.addListener(deactivateBlockElement);
}

function retFalse(event) {
  event.preventDefault();
  event.stopPropagation();
  stopPickingElement();
  ext.backgroundPage.sendMessage(
    {
      type: "forward",
      targetPageId: null,
      payload: {
        type: "blockelement-finished",
        remove: true
      }
    });
  return false;
}

function elementPicked(event, rightBlock) {
  if (!currentElement) {
    return;
  }
  if (currentlyPickingElement) {
    stopPickingElement();
  }
  if (event.which == 3 && !rightBlock) {
    ext.backgroundPage.sendMessage(
      {
        type: "forward",
        targetPageId: null,
        payload: {
          type: "blockelement-finished",
          remove: true
        }
      });
    return;
  }
  var element = currentElement.prisoner || currentElement;
  getFiltersForElement(element, function (filters, selectors) {
    var jwds = document.createElement('div');
    var sty = document.createElement('style');
    document.body.appendChild(jwds);
    document.body.appendChild(sty);
    sty.innerHTML = '#jwdsafe-block{background:white;z-index:9999999;position:fixed;left:20px;top:20px;height:152px;width:360px;border-radius:10px;border:1px solid #d4d4d4;box-shadow:5px 5px 5px #a3a3a3;overflow:hidden;font-family:"microsoft yahei",Arial,Sans-Serif;font-size:14px}#jwdsafe-block .jwds-move{text-align:left;cursor:move;line-height:30px;height:30px;background:#009dff;color:white}#jwdsafe-block .jwds-logo{display:inline-block;margin-left:10px;margin-right:5px;vertical-align:text-bottom}#jwdsafe-block .jwds-close{float:right;position:relative;top:8px;right:10px;cursor:pointer}#jwdsafe-block textarea{margin:10px 0 4px 10px;width:325px;white-space:nowrap;height:60px;padding-top:10px;padding-left:10px;color:#4c4c4c;border-color:#ccc;resize:none}#jwdsafe-block .jwds-btn{width:60px;height:24px;line-height:24px;text-align:center;color:white;background:#009dff;float:right;margin-left:8px;margin-right:11px;cursor:pointer}#jwdsafe-block .jwds-btn:hover{background:#4ebbff}';
    jwds.outerHTML = '<div id="jwdsafe-block"><div class="jwds-move"><img class="jwds-logo"src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAASCAYAAACEnoQPAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTlBMTQ0Mzk1NkRFMTFFNkI1OURFRjgyOEVCQTQzQzkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTlBMTQ0M0E1NkRFMTFFNkI1OURFRjgyOEVCQTQzQzkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OUExNDQzNzU2REUxMUU2QjU5REVGODI4RUJBNDNDOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OUExNDQzODU2REUxMUU2QjU5REVGODI4RUJBNDNDOSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnaaHn8AAAFFSURBVHjalNPNK0RRGMfxO3ekyIKFl0leZjLUiJ3NLPgbSMkfYWdF2SgLWXjZaBaSslFWFhazkoW9t1w2xEajSYkiXN8z/W5dx+Depz51z8vz3HPOPTfh+75DJJHGIHIYQD+6cYsLXIonJcckYxJv/s+o1hdEuYYK01hCGRM4xwnOcIc29CEbMoomR1UWtIKoKuGElmFPGMYOMnGTXVypfzdu8pj6TvGB3jjJR3pzC55RiJo8ovaU2qt4RSpK8h5KqFO7R0tf/C85h0/MY9O6FI9oRELtd3NJ7tGKTnRgXWZQcL5HBq6ePfO2bVXainA5kjjU/FnTkdYefR2O+0fihuYdoz4YGMKDBoroshLNoR1o3EN75W8MTciqookXrCCPNX0qE/toDnLspdWaveDJOukbjNtb+e1gTPVlXGMODdXmfQkwAA3nF5vilXv+AAAAAElFTkSuQmCC"><span>添加过滤规则</span><img class="jwds-close"src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTlBMTQ0MzU1NkRFMTFFNkI1OURFRjgyOEVCQTQzQzkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTlBMTQ0MzY1NkRFMTFFNkI1OURFRjgyOEVCQTQzQzkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OUExNDQzMzU2REUxMUU2QjU5REVGODI4RUJBNDNDOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1OUExNDQzNDU2REUxMUU2QjU5REVGODI4RUJBNDNDOSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pjg2/GcAAABhSURBVHjaYvj///9iIHYBYgY82BWkDsRwA+LXeDS4QuXdYAK4NMAVgvjIEugaYApdYWrQrYRpqEJXiE0xCFf/h4AqdDlcnqkmZDK6G3G62RWbSejiyAKEwtmVgZQYBAgwAAd+hmpF788JAAAAAElFTkSuQmCC"></div><textarea></textarea><div class="jwds-btn jwds-cancel">取消</div><div class="jwds-btn jwds-add">添加</div></div>';

    if (true) {
      var adsPin = false;
      var ads = document.getElementById("jwdsafe-block");
      var move = ads.getElementsByClassName("jwds-move")[0];
      var texta = ads.getElementsByTagName("textarea")[0];
      var addBtn = ads.getElementsByClassName("jwds-add")[0];
      var cancelBtn = ads.getElementsByClassName("jwds-cancel")[0], closeBtn = ads.getElementsByClassName("jwds-close")[0];
      var tmp1 = document.body.onmousemove;
      var tmp2 = document.body.onmouseup;
      texta.value = filters;
      var pt = {
        x: 20,
        y: 20
      };

      ads.onselectstart = function () {
        return false;
      };
      move.onmousedown = function () {
        adsPin = true;
      };
      document.body.onmouseup = function () {
        adsPin = false;
      };
      document.body.onmousemove = function (event) {
        if (!adsPin)
          return;
        pt.x += event.movementX;
        pt.y += event.movementY;
        ads.style.left = pt.x + "px";
        ads.style.top = pt.y + "px";
      };

      addBtn.onclick = function () {
        document.body.onmousemove = tmp1;
        document.body.onmouseup = tmp2;
        ext.backgroundPage.sendMessage(
          {
            type: "add-filters",
            text: texta.value
          },
          function (response) {
            if (response.status == "ok") {
              ext.backgroundPage.sendMessage(
                {
                  type: "forward",
                  targetPageId: null,
                  payload: {
                    type: "blockelement-finished",
                    remove: true
                  }
                });
              ads.remove();
            }
            else
              alert(response.error);
          });
      };
      cancelBtn.onclick = closeBtn.onclick = function () {

        document.body.onmousemove = tmp1;
        document.body.onmouseup = tmp2;
        deactivateBlockElement();
        ads.remove();
      }
    }


    if (selectors.length > 0) {
      highlightElements(selectors.join(","));
    }
    highlightElement(currentElement, "#fd1708", "#f6a1b5");
  }.bind(this));
  event.preventDefault();
  event.stopPropagation();
}

function stopPickingElement() {
  currentlyPickingElement = false;
  document.removeEventListener("mousedown", stopEventPropagation, true);
  document.removeEventListener("mouseup", stopEventPropagation, true);
  document.removeEventListener("mouseenter", stopEventPropagation, true);
  document.removeEventListener("mouseleave", stopEventPropagation, true);
  document.removeEventListener("mouseover", mouseOver, true);
  document.removeEventListener("mouseout", mouseOut, true);
  document.removeEventListener("click", elementPicked, true);
  document.removeEventListener("keydown", keyDown, true);
  document.removeEventListener("contextmenu", retFalse, true);
}

function deactivateBlockElement() {
  if (currentlyPickingElement) {
    stopPickingElement();
  }
  if (blockelementPopupId != null) {
    ext.backgroundPage.sendMessage(
      {
        type: "forward",
        targetPageId: blockelementPopupId,
        payload: {
          type: "blockelement-close-popup"
        }
      });
    blockelementPopupId = null;
  }
  lastRightClickEvent = null;
  if (currentElement) {
    unhighlightElement(currentElement);
    currentElement = null;
  }
  unhighlightElements();
  var overlays = document.getElementsByClassName("__adblockplus__overlay");
  while (overlays.length > 0) {
    overlays[0].parentNode.removeChild(overlays[0]);
  }
  ext.onExtensionUnloaded.removeListener(deactivateBlockElement);
}
if ("ext" in window && document instanceof HTMLDocument) {
  document.addEventListener("contextmenu", function (event) {
    lastRightClickEvent = event;
    lastRightClickEventIsMostRecent = true;
    ext.backgroundPage.sendMessage(
      {
        type: "forward",
        payload: {
          type: "blockelement-clear-previous-right-click-event"
        }
      });
  }, true);
  ext.onMessage.addListener(function (msg, sender, sendResponse) {
    switch (msg.type) {
      case "blockelement-get-state":
        if (window == window.top) {
          sendResponse(
            {
              active: currentlyPickingElement || blockelementPopupId != null
            });
        }
        break;
      case "blockelement-start-picking-element":

        if (window == window.top) {
          startPickingElement();
        }
        break;
      case "blockelement-context-menu-clicked":
        var event = lastRightClickEvent;
        deactivateBlockElement();
        if (event) {
          getBlockableElementOrAncestor(event.target, function (element) {
            if (element) {
              currentElement = element;
              elementPicked(event, true);
            }
          });
        }
        break;
      case "blockelement-finished":
        if (currentElement && msg.remove) {
          checkCollapse(currentElement.prisoner || currentElement);
          updateStylesheet();
        }
        deactivateBlockElement();
        break;
      case "blockelement-clear-previous-right-click-event":
        if (!lastRightClickEventIsMostRecent) {
          lastRightClickEvent = null;
        }
        lastRightClickEventIsMostRecent = false;
        break;
      case "blockelement-popup-opened":
        if (window == window.top) {
          blockelementPopupId = msg.popupId;
        }
        break;
      case "blockelement-popup-closed":
        if (window == window.top && blockelementPopupId == msg.popupId) {
          ext.backgroundPage.sendMessage(
            {
              type: "forward",
              payload: {
                type: "blockelement-finished"
              }
            });
        }
        break;
    }
  }.bind(this));
  if (window == window.top) {
    ext.backgroundPage.sendMessage(
      {
        type: "report-html-page"
      });
  }
}
