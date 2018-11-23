/**
 * Created by yushuhui on 2016/8/8.
 */
//init
var backgroundPage = chrome.extension.getBackgroundPage();
window.ext = Object.create(backgroundPage.ext);
backgroundPage = backgroundPage.window;
var require = backgroundPage.require;
var Filter = require("filterClasses").Filter;
var FilterStorage = require("filterStorage").FilterStorage;
var Prefs = require("prefs").Prefs;
var checkWhitelisted = require("whitelisting").checkWhitelisted;
var page = null;
var isSogou = navigator.userAgent.indexOf('MetaSr') != -1;
var switched = false, expanded = false;

ext.pages.query({active: true, lastFocusedWindow: true}, function (pages) {
  page = pages[0];
});

window.onload = function () {
  //variables
  var iSt;
  var switching = false;

  //update count
  setInterval(updateCount, 1000);
  setTimeout(function () {
    document.getElementById("score-detail").style.webkitTransition = "margin-top 0.3s ease-in-out";
  }, 200);
  //init
  if (Prefs.show_statsinicon) {
    document.getElementById('check').classList.add('on');
  }
  document.getElementById('cancel').onclick = toggleClickHide;
  if (localStorage.enabled == "false") {
    document.getElementById('intro').textContent = "点击开启拦截";
    document.getElementById('block').title = "请先开启拦截";
    var header = document.getElementsByTagName('header')[0];
    header.style.transitionDuration = "0s";
    header.classList.add('dark');
    setTimeout(function () {
      header.style.transitionDuration = "";
    }, 10);
    document.getElementById('main').classList.add('gray');
  }

  if (localStorage.VadNewNotify == "true") {
    document.getElementById("ring").style.display = "block";
  }
  document.getElementById("ring").onclick = function () {
    localStorage.VadNewNotify = false;
    window.open("options.html#s5");
  }

  document.getElementById("logo").onmouseenter = function () {
    document.getElementById("intro").style.display = "block";
  };

  document.getElementById("logo").onmouseleave = function () {
    document.getElementById("intro").style.display = "none";
  };

  //cancel select
  document.body.onselectstart = function () {
    return false;
  };

  //switch
  document.getElementById('logo').onclick = function () {
    if (switching)
      return;
    var bodyList = document.getElementById('main').classList;
    //boot up
    if (bodyList.contains("gray") || bodyList.contains("anm-go-gray")) {

      bodyList.remove('gray');
      bodyList.remove("anm-go-gray");
      document.getElementsByTagName('header')[0].classList.remove('dark');
      document.getElementById('intro').textContent = "点击关闭拦截";
      bodyList.add("anm-go-color");
      document.getElementById('block').title = "";
      localStorage.enabled = true;
      FilterStorage.removeFilter(Filter.fromText("@@||*^$document"));
      if (localStorage.VadRunning == "false") {
        ext.backgroundPage.getWindow().VadInit();
      }
    }
    //halt
    else {
      bodyList.remove("anm-go-color");
      bodyList.add("anm-go-gray");
      document.getElementById('block').title = "请先开启拦截";
      document.getElementById('intro').textContent = "点击开启拦截";
      document.getElementsByTagName('header')[0].classList.add('dark');
      localStorage.enabled = false;
      var filter = Filter.fromText("@@||*^$document");
      if (filter.subscriptions.length && filter.disabled)
        filter.disabled = false;
      else {
        filter.disabled = false;
        FilterStorage.addFilter(filter);
      }
      if (localStorage.VadRunning == "true") {
        ext.backgroundPage.getWindow().VadHalt();
      }
    }
    switching = true;
    document.getElementById('logo').classList.add('disabled');
    setTimeout(function () {
      switching = false;
      document.getElementById('logo').classList.remove('disabled');
    }, 1000);
  };

  //check clicked
  document.getElementById('check').onclick = function () {
    if (this.classList.contains('on')) {
      this.classList.remove('on');
    } else {
      this.classList.add('on');
    }
    Prefs.show_statsinicon = !Prefs.show_statsinicon;
  };

  //menu clicked
  Array.prototype.slice.call(document.getElementsByClassName('menu')).forEach(function (elem) {
    elem.onclick = function () {
      switch (elem.id) {
        case "block":
          if (localStorage.enabled == "false")
            return;
          toggleClickHide();
          break;
        case "score":
          expanded = !expanded;
          var expandList = document.getElementById('expand').classList;
          if (expandList.contains('expand')) {
            expandList.remove('expand');
            document.getElementById('rotate').classList.remove('on');
          } else {
            expandList.add('expand');
            document.getElementById('rotate').classList.add('on');
          }
          fixSogou();
          break;
        case "options":
          ext.showOptions();
          window.close();
          break;
        case "feedback":
          window.open(chrome.runtime.getURL("options.html#s4"));
          break;
      }
    }
  });

  //share clicked
  Array.prototype.slice.call(document.getElementsByClassName('share')).forEach(function (e, i) {
    e.onclick = function () {
      var shareImgUrl = "http://adclear.b0.upaiyun.com/pc_v4/plugin/share/(#NUM).jpg";
      var shareImgIndex = Math.ceil(Math.random() * 31);
      shareImgUrl = shareImgUrl.replace("#NUM", shareImgIndex);

      var urls = []
        if (i != 2)
        window.open(urls[i].replace("#SHAREPIC", shareImgUrl));
    }
  });

  //update statistics
  function updateCount() {
    var t = Prefs.blocked_total;
    document.getElementById('totalBlocked').textContent = t ? t : 0;
    chrome.tabs.getSelected(null, function (tabs) {
      var c = Prefs.blockedPerPage._map[tabs.id];
      document.getElementById('pageBlocked').textContent = c ? c : 0;
    });
  }

  //select to block
  function toggleClickHide() {
    switched = !switched;
    fixSogou();
    var main = document.getElementById("main");
    var hide = document.getElementById("clickHide");
    if (main.classList.contains("hide")) {
      if (iSt)
        clearTimeout(iSt);
      page.sendMessage({type: "blockelement-finished"});
      main.classList.remove('hide');
      hide.classList.add('hide');
    } else {
      page.sendMessage({type: "blockelement-start-picking-element"});
      main.classList.add('hide');
      hide.classList.remove('hide');
      var iTime = 5000;
      if (navigator.userAgent.indexOf("Mac") != -1) {
        iTime = 500;
      }
      iSt = setTimeout(function () {
        window.close();
      }, iTime);
    }
  }

  function fixSogou() {
    if(!isSogou)
      return;
    if(switched){
      document.body.style.height = "236px";
    }else if(expanded){
      document.body.style.height = "572px";
    }else{
      document.body.style.height = "306px";
    }
  }
};