/**
 * Created by yushuhui on 2016/5/11.
 */
 
var url_id = "http://plugin.newadblock.com:1008/id.ashx";
var url_i = "http://plugin.newadblock.com:1008/i.ashx";
var channel = "101";


(function(){

	var version = chrome.runtime.getManifest().version;
	
	var newdate = new Date();
	var timestamp = newdate.toJSON().replace(/T/, " ").substr(0,19);
	var newday = newdate.toDateString();

    chrome.runtime.onInstalled.addListener(function () {
			console.log(version);
		_req("POST", url_id, {timestamp: timestamp}, function(){
			if (this.readyState == 4) {
				var err = JSON.parse(this.responseText).error;
					if(err == "0")
					{
						var userid = JSON.parse(this.responseText).userid;
						localStorage.auserid = userid;

					}
					else
						localStorage.auserid = "0";
				_req("POST", url_i, {
					UserID: localStorage.auserid,
					ChannelNum: channel,
					Version: version,
					PluginInstal: 1,
					PluginStart: 0,
					InterceptCount: 0
					}, null);
			}
		});
    });
})();

(function(){

	if(require("prefs").Prefs.blocked_total == 0 )
		return setTimeout(arguments.callee, 3000);//arguments.callee(nu+1);
	
	var version = chrome.runtime.getManifest().version;
	
	var newdate = new Date();
	var newday = newdate.toDateString();
	
	if(localStorage.aday == null)
	{

		localStorage.aday = newday;
		return ;
	}
	else if(localStorage.aday != newday)
	{
		localStorage.aday = newday;
		

		if(localStorage.blockt == null )
		{
			localStorage.blockt = 0;

		}			
		var block_tod = require("prefs").Prefs.blocked_total - localStorage.blockt;

		localStorage.blockt = require("prefs").Prefs.blocked_total;
		console.log(version);
		_req("POST", url_i, {
			UserID: localStorage.auserid,
			ChannelNum: channel,
			Version: version,
			PluginInstal: 0,
			PluginStart: 1,
			InterceptCount: block_tod
			}, null);
	}
})();
