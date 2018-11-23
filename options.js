/**
 * Created by yushuhui on 2016/8/17.
 */

//load adb
var backgroundPage = ext.backgroundPage.getWindow();
var require = backgroundPage.require;
with (require("filterClasses")) {
  this.Filter = Filter;
  this.WhitelistFilter = WhitelistFilter;
}
with (require("subscriptionClasses")) {
  this.Subscription = Subscription;
  this.SpecialSubscription = SpecialSubscription;
  this.DownloadableSubscription = DownloadableSubscription;
}
with (require("filterValidation")) {
  this.parseFilter = parseFilter;
  this.parseFilters = parseFilters;
}
var FilterStorage = require("filterStorage").FilterStorage;
var FilterNotifier = require("filterNotifier").FilterNotifier;
var Prefs = require("prefs").Prefs;
var Synchronizer = require("synchronizer").Synchronizer;
var Utils = require("utils").Utils;
var NotificationStorage = require("notification").Notification;
var userFilters = backgroundPage.getUserFilters();
var currentMenu = 1;

//dom ready
(function () {
  //dom ready
  if (!document.body)
    return setTimeout(arguments.callee, 50);

  //bind
  document.body.onselectstart = function () {
    return false;
  };
  window.onresize = initSize;
  document.getElementById('setting').onmousewheel = onWheel;
  document.getElementById('setting').onscroll = onScroll;
  document.getElementById("easy-check").onclick = toggleEasyList;
  document.getElementById("vad-check").onclick = toggleVadList;
  document.getElementById("s1-update").onclick = updateRule;
  document.getElementById("s2-add").onclick = addRule;
  document.getElementById('s2-rules').onclick = delRule;
  document.getElementById('menu').onclick = menuClick;
  document.getElementById("s4-right-check").onclick = rightCheck;
  document.getElementById("s2-edit-text").onclick = toggleRuleBox;
  document.getElementById("s3-add").onclick = addDomain;
  document.getElementById("s3-whiteList").onclick = delDomain;
  document.getElementById("close").onclick = function () {
    window.close()
  };
  document.getElementById("s4-qq-1").onclick = function () {
    window.open("http://shang.qq.com/wpa/qunwpa?idkey=137b83615c74bd069d97bebc40cb9163b62202ff01341a2a84704d0871d952ff");
  };
  document.getElementById("s4-qq-2").onclick = function () {
    window.open("http://shang.qq.com/wpa/qunwpa?idkey=f4110f22abaf995652cf165858817c51a1d85f3c66baf38050dae71a08f40f2e");
  };
  document.getElementById("version").textContent = chrome.app.getDetails().version;
  //init
  initSize();
  initStatus();
  initRule();
  initWhiteList();
  initNotification();
  initScroll();
  setInterval(initStatus, 2000);
})();

function initNotification() {
  var notification = localStorage.VadNotification;
  notification = (notification == undefined) ? [] : JSON.parse(notification);
  notification.forEach(function (e) {
    var container = document.createElement('div');
    container.className = "s5-notify";
    for(var k in e){
      var s = document.createElement('p');
      s.textContent = e[k];
      container.appendChild(s);
    }
    document.getElementById("s5").appendChild(container);
  });
}

function initSize() {
  var absTop, absLeft;
  var tHeight = document.documentElement.clientHeight;
  var tWidth = document.documentElement.clientWidth;
  var elBg = document.getElementById('bg');
  var elMain = document.getElementById('main');
  if (tHeight < 548) {
    absTop = 0;
  } else {
    absTop = (tHeight - 548) / 2;
  }
  if (tWidth < 700) {
    absLeft = 0;
  } else {
    absLeft = (tWidth - 700) / 2;
  }
  absTop += "px";
  absLeft += "px";
  elBg.style.top = absTop;
  elBg.style.left = absLeft;
  elMain.style.top = absTop;
  elMain.style.left = absLeft;
  elBg.style.display = "block";
  elMain.style.display = "block";
}

function initStatus() {
  if (FilterStorage.subscriptions[1].disabled == false) {
    document.getElementById("easy-check").classList.add('on');
  }
  if (localStorage.vadSubscribed == undefined) {
    localStorage.vadSubscribed = "true";
  }
  if (localStorage.vadSubscribed == "true") {
    document.getElementById("vad-check").classList.add('on');
  }
  if (Prefs.shouldShowBlockElementMenu) {
    document.getElementById("s4-right-check").classList.add('on');
  }
  var easyTime = "";
  if (FilterStorage.subscriptions[1].downloadStatus != "synchronize_ok") {
    easyTime = "更新请求失败,请检查网络或反馈给净网大师"
  } else {
    easyTime = "最近更新 " + new Date(FilterStorage.subscriptions[1]._lastDownload * 1000).toLocaleString();
  }
  document.getElementById("easy-updateTime").textContent = easyTime;

  if (localStorage.vadUpdateSuccess == "true") {
    easyTime = "最近更新 " + new Date(Number(localStorage.vadUpdateTime)).toLocaleString();
  } else {
    easyTime = "更新请求失败,请检查网络或反馈给净网大师"
  }
  document.getElementById("vad-updateTime").textContent = easyTime;
  //document.getElementById("update-img").classList.remove("updating");
}

function toggleEasyList() {
  if (this.classList.contains('on')) {
    this.classList.remove('on');
    FilterStorage.subscriptions[1].disabled = true;
  } else {
    this.classList.add('on');
    FilterStorage.subscriptions[1].disabled = false;
  }
}

function toggleVadList() {
  if (this.classList.contains('on')) {
    this.classList.remove('on');
    localStorage.vadSubscribed = "false";
    if (localStorage.VadRunning == "true") {
      ext.backgroundPage.getWindow().VadHalt();
    }
  } else {
    this.classList.add('on');
    localStorage.vadSubscribed = "true";
    if (localStorage.VadRunning == "false") {
      ext.backgroundPage.getWindow().VadInit();
    }
  }
}

function updateRule() {
  document.getElementById("update-img").classList.add("updating");
  setTimeout(function () {
    document.getElementById("update-img").classList.remove("updating");
  }, 2000);
  setTimeout(function () {
    var subscription = FilterStorage.subscriptions[1];
    if (subscription instanceof DownloadableSubscription)
      Synchronizer.execute(subscription, true, true);
    //ext.backgroundPage.getWindow().VadClearCache();
    ext.backgroundPage.getWindow().VadUpdate();
  }, 2100);
}

function initRule() {
  document.getElementById("s2-rules").innerHTML = "";
  var flterText = "";
  userFilters = backgroundPage.getUserFilters();
  userFilters.filters.forEach(function (str) {
    addRuleFromString(str);
    flterText += str;
    flterText += "\n";
  });
  document.getElementById("s2-rules-textarea").value = flterText;
}

function initWhiteList() {
  userFilters = backgroundPage.getUserFilters();
  userFilters.exceptions.forEach(function (str) {
    if (str != "*")
      addWhiteFromString(str);
  });
}


function addRuleFromString(str) {
  var text = '<span class="s2-rule-text">###</span> <span class="s2-rule-del"><img src="skin/options/del2.png"> 删除规则</span>';
  var elP = document.createElement('p');
  elP.innerHTML = text.replace("###", str);
  document.getElementById("s2-rules").appendChild(elP);
}

function addRule() {
  var userRule = document.getElementById("s2-rule-add").value;
  if (userRule.trim() != "") {
    var result = parseFilter(userRule);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.filter) {
      document.getElementById("s2-rule-add").value = "";
      FilterStorage.addFilter(result.filter);
      initRule();
    }
  }
}

function delRule() {
  var tgt = event.target;
  if (tgt.tagName == "IMG") {
    tgt = tgt.parentElement;
  }
  if (tgt.className == "s2-rule-del") {
    tgt = tgt.previousElementSibling;
    FilterStorage.removeFilter(Filter.fromText(tgt.textContent));
    tgt.parentElement.remove();
  }
}

function delDomain() {
  var tgt = event.target;
  if (tgt.tagName == "IMG") {
    tgt = tgt.parentElement;
  }
  if (tgt.className == "s2-rule-del") {
    tgt = tgt.previousElementSibling;
    FilterStorage.removeFilter(Filter.fromText("@@||" + tgt.textContent + "^$document"));
    tgt.parentElement.remove();
  }
}

function toggleRuleBox() {
  if (this.classList.contains("on")) {
    this.classList.remove("on");
  } else {
    this.classList.add("on");
  }
  ;
  var txtEra = document.getElementById("s2-rules-textarea");
  var s2rule = document.getElementById("s2-rules");
  if (txtEra.classList.contains("hide")) {
    txtEra.classList.remove("hide");
    s2rule.classList.add("hide");
  } else {
    txtEra.value.split("\n").forEach(function (str) {
      if (str.trim() == "")
        return;
      var result = parseFilter(str);
      if (result.error) {
        alert(result.error);
        return;
      }
      FilterStorage.addFilter(result.filter);
    });
    txtEra.classList.add("hide");
    s2rule.classList.remove("hide");
  }
  initRule();
}

function initScroll() {
  window.secHeight = [];
  for (var i = 1; i < 6; i++) {
    var t = document.getElementById('s' + i);
    window.secHeight.push(t.offsetTop);
  }
  if (location.hash == "#s4") {
    location.href = "options.html#s4";
    setMenu(4);
  }
  if (location.hash == "#s5") {
    location.href = "options.html#s5";
    setMenu(5);
  }
}

function onWheel() {
  event.preventDefault();
  if (window.vadScroll > 0)
    return;
  var dir = event.deltaY > 0;
  document.getElementById('setting').scrollTop += (dir ? 1 : -1) * 35;
  var sTop = document.getElementById('setting').scrollTop;
}

function onScroll() {
  if (window.vadScroll > 0)
    return;
  var sTop = document.getElementById('setting').scrollTop;
  for (var i = 0; i < window.secHeight.length; i++) {
    var h = window.secHeight[i];
    if (sTop - 100 <= h && sTop + 100 >= h && (i + 1) != currentMenu) {
      setMenu(i + 1);
    }
  }
}

function setMenu(index, jump) {
  if (window.vadScroll > 0)
    return;
  if (currentMenu == index)
    return;
  currentMenu = index;
  Array.prototype.slice.call(document.getElementById('menu').children).forEach(function (el, idx) {
    if (idx + 1 == currentMenu) {
      el.classList.add("active");
    } else {
      el.classList.remove('active');
    }
  });

  if (jump) {
    //document.getElementById("setting").scrollTop = window.secHeight[index - 1] - 73;

    anmScroll(window.secHeight[index - 1] - 73)
  }
}

function anmScroll(dist) {
  var duration = dist - document.getElementById("setting").scrollTop;
  var quality = 15;

  window.vadAnmDist = duration / quality;
  window.vadDist = dist;
  window.vadScroll = setInterval(function () {
    var s = document.getElementById("setting").scrollTop;
    var d = s - window.vadDist;
    if (d > -20 && d < 20) {
      document.getElementById("setting").scrollTop = window.vadDist;
      clearInterval(window.vadScroll);
      window.vadScroll = -1;
    } else {
      document.getElementById("setting").scrollTop = s + vadAnmDist;
    }
  }, quality);
}

function menuClick() {
  if (event.target.tagName == "DD") {
    setMenu(Array.prototype.slice.call(event.target.parentElement.children).indexOf(event.target) + 1, true);
  }
}

function rightCheck() {
  if (this.classList.contains("on")) {
    this.classList.remove("on");
    Prefs.shouldShowBlockElementMenu = false;
  } else {
    this.classList.add("on");
    Prefs.shouldShowBlockElementMenu = true;
  }
}

function addDomain() {
  var domain = document.getElementById("newWhitelistDomain").value.replace(/\s/g, "");
  document.getElementById("newWhitelistDomain").value = "";
  if (domain == "")return;
  var exceps = backgroundPage.getUserFilters().exceptions;
  for (var i = 0; i < exceps.length; i++) {
    if (domain == exceps[i])
      return;
  }
  addWhiteFromString(domain);
  if (!domain)
    return;
  var filterText = "@@||" + domain + "^$document";
  FilterStorage.addFilter(Filter.fromText(filterText));
}

function addWhiteFromString(str) {
  var text = '<span class="s2-rule-text">###</span> <span class="s2-rule-del"><img src="skin/options/del2.png"> 删除规则</span>';
  var elP = document.createElement('p');
  elP.innerHTML = text.replace("###", str);
  document.getElementById("s3-whiteList").appendChild(elP);
}