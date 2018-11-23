/**
 * Created by yushuhui on 2016/8/14.
 */

console.log("version 20160927");
window.vadProxy = {};

window.VadSetProxy = function () {
  if (vadProxy == true)
    return;
  chrome.proxy.settings.set({
    value: {
      mode: "pac_script",
      pacScript: {
        data: "function FindProxyForURL(url, host) {\n  var regexpr = /http:.*\\/crossdomain\\.xml/;\n   if(regexpr.test(url)){\n        return 'PROXY yk.pp.navi.youku.com:80';\n   }\n return 'DIRECT';\n}"
      }
    },
    scope: "regular"
  });
  vadProxy = true;
  setTimeout(ClearProxy, 3000);
};

window.ClearProxy = function () {
  if (vadProxy == false)
    return;
  chrome.proxy.settings.get({
    incognito: !1
  }, function (c) {
    if (c.levelOfControl == "controlled_by_this_extension") {
      chrome.proxy.settings.clear({
        scope: "regular"
      });
    }
  });
  vadProxy = false;
};

window.VadBlockContent = function (details) {
  return { cancel: true };
};

window.VadBlockList = ["http://msg.71.am/cp2.gif*", "http://data.video.qiyi.com/videos/other/*/*/*/*.hml*", "http://*/videos/other/*/*/*/*.f4v*", "http://*/*/*/*/letv-gug/*/ver_*-avc-*-aac-*.letv*", "http://*.letvimg.com/lc*_gugwl/*/*/*/*/*", "http://*.letvimg.com/lc*_diany/*/*/*/*/*", "http://*/vmind.qqvideo.tc.qq.com/*.mp4?vkey=*", "http://*.gtimg.com/qqlive/*"];


window.VadInit = function () {

  window.VadTabUpdate = function (tabId, changeInfo, tab) {
    if (/http:\/\/v.youku.com\/v_show\/.*/.test(tab.url)) {
      chrome.tabs.executeScript(id, {
        code: "document.getElementById('playerBox').setAttribute('player','adt')",
        runAt: "document_end"
      }, function (results) {
      })
    }
    if (tab.url.indexOf("iqiyi.com") > -1) {
      chrome.tabs.executeScript(tabId, {
        code: '0<window.location.href.indexOf("iqiyi.com")&&function(e){var d=e.getElementById("flash");null==d&&(d=e.getElementById("swf_flashbox"));if(null!=d&&"1"!=d.getAttribute("ddv")){var f=d.parentElement;e=e.getElementsByName("flashVars")[0];if("undefined"!=typeof e){for(var c=e.value.split("&"),a="",b=0;b<c.length;b++)0==c[b].indexOf("definitionID")||0==c[b].indexOf("menu")||0==c[b].indexOf("autoplay")||0==c[b].indexOf("tvId")||0==c[b].indexOf("flashP2PCoreUrl")||0==c[b].indexOf("origin")||0==c[b].indexOf("albumId")?(""!=a&&(a+="&"),a+=c[b]):0==c[b].indexOf("cid")&&(a+="&cid=qc_100001_100100");1>a.indexOf("qc_100001_100100")&&(a+="&cid=qc_100001_100100");e.value=a+"&menu=false";f.removeChild(d);d.setAttribute("ddv","1");f.appendChild(d)}}}(document);',
        runAt: 'document_end'
      })
    }
  };

  ClearProxy();
  chrome.webRequest.onBeforeRequest.addListener(VadBlockContent, { urls: VadBlockList }, ["blocking"]);
  chrome.tabs.onUpdated.addListener(window.VadTabUpdate);
  window.VadOnBeforeRequest = function (details) {
    if (/^http:\/\/player\.letvcdn\.com\/.*p\/.*\/newplayer\/LetvPlayer\.swf.*baidushort.*/i.test(details.url)) {
      return;
    }
    if (details.url.toLowerCase().indexOf("crossdomain.xml") != -1) {
      VadSetProxy();
      return;
    }
    var vRules = [
      //LETV
      {
        reg: /^http:\/\/player\.letvcdn\.com\/.*p\/.*\/newplayer\/LetvPlayer\.swf.*/,
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/letv.swf"
      },
      {
        reg: /http:\/\/www.le.com\/.*\/playerapi\/pccs_(?!(live|sdk)).*_?(\d+)\.xml/i,
        replace: "http://www.letv.com/cmsdata/playerapi/pccs_sdk_20141113.xml"
      },
      {
        reg: /http:\/\/www.letv.com\/.*\/playerapi\/pccs_(?!(live|sdk)).*_?(\d+)\.xml/i,
        replace: "http://www.letv.com/cmsdata/playerapi/pccs_sdk_20141113.xml"
      },
      {
        reg: /^http:\/\/player\.hz\.letv\.com\/hzplayer\.swf\/v_list=zhuanti/,
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/letv.swf"
      },
      //PPS
      {
        reg: /^http:\/\/www\.iqiyi\.com\/player\/cupid\/common\/pps_flvplay_s\.swf/,
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/pps.swf"
      },
      //Sohu
      {
        reg: "http://220.181.90.161/wp8player/Main.swf",
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/sohu160908.swf"
      },
      {
        reg: "http://tv.sohu.com/upload/swf/.*/Main.swf",
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/sohu160908.swf"
      },
      //qq
      {
        reg: ".*imgcache.qq.com/tencentvideo.*/player.*/MediaPlugin.swf.*",
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/qq.swf"
      },
      //Ku6
      {
        reg: /^http:\/\/player\.ku6cdn\.com\/default\/.*\/\d+\/(v|player|loader)\.swf/,
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/ku6.swf"
      },
      {
        reg: /^http:\/\/player\.ku6\.com\/inside\/(.*)\/v\.swf/,
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/ku6-p.swf"
      },
      //17173
      {
        reg: "http://f.v.17173cdn.com/.*flash/PreloaderFileFirstpage.swf.*",
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/adsafeplugin001/17173.swf"
      },
      {
        reg: "http://f.v.17173cdn.com/.*flash/Player_file.swf.*",
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/adsafeplugin001/17173.swf"
      },
      {
        reg: "http://f.v.17173cdn.com/.*flash/PreloaderFile.swf.*",
        replace: "http://adclear.b0.upaiyun.com/pc_v4/plugin/data/adsafeplugin001/17173.swf"
      },
      {
        reg: ".*adsafeplugin001/SM.swf",
        replace: "http://f.v.17173cdn.com/20160926/flash/SM.swf"
      },
      {
        reg: ".*adsafeplugin001/FilePlayer.swf",
        replace: "http://f.v.17173cdn.com/20160926/flash/FilePlayer.swf"
      }
    ];
    for (var vIndex = 0; vIndex < vRules.length; vIndex++) {
      var vRu = vRules[vIndex];
      if (details.url.match(vRu.reg)) {
        Prefs.blocked_total++;
        Prefs.blockedPerPage._map[details.tabId]++;
        var m = details.url.split('?');
        if (m.length > 1)
          m = "?" + m[1];
        else m = "";
        return {
          redirectUrl: vRu.replace + m
        }
      }
    }
  };
  localStorage.VadRunning = "true";
};

window.VadHalt = function () {
  ClearProxy();
  chrome.webRequest.onBeforeRequest.removeListener(VadBlockContent, { urls: VadBlockList }, ["blocking"]);
  chrome.tabs.onUpdated.removeListener(window.VadTabUpdate);
  window.VadTabUpdate = function () { };
  window.VadOnBeforeRequest = function () { };
  localStorage.VadRunning = "false";
};
if (localStorage.enabled != "false")
  VadInit();