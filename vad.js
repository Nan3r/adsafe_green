/**
 * Created by Yushuhui on 2016/8/14.
 */
function _req(method, url, data, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.onreadystatechange = callback;
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.send(JSON.stringify(data));
};

var VadOnBeforeRequest = function () {};
var VadUrlVideoCleanBk = "ext/videoClean.js";
var VadUpdateUrl = "http://adclear.b0.upaiyun.com/pc_v4/plugin/notify.json";
var VadNotifyUrl = "http://adclear.b0.upaiyun.com/pc_v4/plugin/notification.json";
var VadDebug = false;

var VadUpdate = function(){
  _req("GET", chrome.runtime.getURL(VadUrlVideoCleanBk), null, function(dt) {
	if (this.readyState == 4) {
	  eval(this.responseText);
	}
  });

};

var VadCheckNotify = function(){
  _req("GET", chrome.runtime.getURL("manifest.json"), null, function(){
    if (this.readyState == 4) {
      window.VadVersion = Number(JSON.parse(this.responseText).version.replace('.','').replace('.',''));
      localStorage.VadVersion = window.VadVersion;

      var ck = localStorage.VadCheckTime;
      if(ck != undefined){
        if((new Date().getTime() - Number(ck)) < 86400000)
          return;
      }

      _req("GET", VadNotifyUrl, null, function() {
        if(this.readyState == 4 && this.status == 200){
          localStorage.VadCheckTime = new Date().getTime();
          var localContent = localStorage.VadNotification;
          var notifyContent = (localContent == undefined) ? [] : JSON.parse(localContent);
          var latestContent = JSON.parse(this.responseText);
          if(latestContent.length > notifyContent.length){
            localStorage.VadNewNotify = true;
            localStorage.VadNotification = this.responseText;
          }
          //update ring icon
          /*var res = JSON.parse(this.responseText);
          var sVersion = Number(res.version.replace('.','').replace('.',''));
          localStorage.VadLatest = sVersion;
          if(sVersion > window.VadVersion){
            chrome.notifications.onClicked.addListener(function(e){
              window.open(res.page);
            });
            chrome.notifications.create({
              type: 'basic',
              iconUrl: './icons/detailed/abp-128.png',
              title: res.title,
              message: res.content,
              priority: 2,
              isClickable: true
            });
          }*/
        }
      });
    }
  });
};

window.VadOnBeforeRequest = function(){};
window.VadInit = function(){};
window.VadHalt = function(){};

VadUpdate();
VadCheckNotify();

