

var betterTitle = "";
function addToTitle(str,noSpace){
    noSpace = typeof noSpace !== 'undefined' ? noSpace : false;
    if(str.trim()==="") return false;
    if(betterTitle==="") betterTitle=str;
    else betterTitle=betterTitle+ (noSpace ? "" : " ") +str;
    return true;
}
function parseTime(timeString,dt) {    //Not originally written by me; only made modifications to handle seconds
    if (!dt) {
        dt = new Date();
    }
    if (timeString === '') return null;

    var time = timeString.match(/(\d+)(:(\d\d)(:(\d\d))?)?\s*(p?)/i); 
    if (time === null) return null;

    var hours = parseInt(time[1],10);    
    if (hours == 12 && !time[6]) {
        hours = 0;
    }
    else {
        hours += (hours < 12 && time[6])? 12 : 0;
    }             
    dt.setHours(hours);
    dt.setMinutes(parseInt(time[3],10) || 0);
    dt.setMinutes(parseInt(time[5],10) || 0);
    return dt;
}

//*** START ***
var skipRest=false;
//General

//Files/Workbin hack
if(!skipRest && document.URL.search(/WorkbinID/i)!=-1){
	//Inserting our folder tree panel
	var treePanel = document.createElement("div");
	var mainPanel = $(".panel-default").css({"float":"right","width":"75%"});
	$(mainPanel).find("#titleNav").html("<span>" + $(mainPanel).find(".lblHead").html() + "</span>");
	$(mainPanel).parent().css("padding-left","0");
	$(mainPanel).before(treePanel);

	//HTML of treePanel
	$(treePanel).attr("id","BIVLE_treePanel").addClass("panel panel-default").css({"float":"left","width":"25%"});
	treePanel.innerHTML = "<div class='panel-heading'><img src='/v1/Content/Images/treeview.png' style='vertical-align:top' /> Folders</div><div class='panel-body' style='padding:1%'><ul style='display:block;list-style:none;padding-left:0;max-height:450px;overflow-x:hidden;overflow-y:auto;' id='BIVLE_foldermenu'><li class='dropdown-header'><span class='icon-spinner'></span>&nbsp;Loading folders...</li></ul></div>";

	//Getting the folders
	//Get CourseID
	$.get("getfoldermenu.ashx?CourseID=" + document.URL.match(/CourseID=(.*?)&/i)[1] + "&_=" + $.now(), function(data){
		$("#BIVLE_foldermenu").html(data);
	});

	//skipRest = true;
}

//What's New hack
if(!skipRest && document.URL.search(/whats_new/i)!=-1){
	//Check for last visited time
	var oldD = new Date();
	chrome.storage.sync.get("BIVLE_WhatsNewLastVisited", function(items){
		var storedD = items["BIVLE_WhatsNewLastVisited"];
		
		if(storedD!="undefined"){
			oldD.setTime(storedD);
			//Search within each day
			var tempE = new Date();
			$("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_pnlStudent").html($("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_spnStudent").html());
			$.each($("h3.panel-title"),function(i,obj){
				tempE.setTime(Date.parse($(obj).html()));
				var childBullets = $(obj).parent().parent().find("li");
				//Case 1: New days (new <h3> panels)
				if(tempE > oldD){
					//TODO: get better colours

					//Is this new day empty?
					if($(childBullets).length){
						//Highlight panel
						$(obj).parent().css("backgroundColor","#EE2222");
						//Highlight every entry in each new day
						$.each($(childBullets), function(j,obj2){
							$(obj2).css("color","#CC2222");
						});
					}
				}else{
					//Case 2: Same day (check for new items in <li>)
					if(tempE.getDay()==oldD.getDay()){
						$.each($(childBullets), function(j, obj2){
							//Get time
							if(parseTime($(obj2).find("a[href]").html(),tempE) > oldD)
								$(obj2).css("color","#CC2222");
						});
					}
				}
			});
		}
	});
	chrome.storage.sync.set({"BIVLE_WhatsNewLastVisited": $.now()});
	skipRest = true;
}

if(!skipRest){
	//Page titles hack
	var skipBreadcrumb=false;
	var gotModuleCode=false;

	//Get breadcrumb
	$.each($("ul.breadcrumb > li > a[href]"), function(i,obj){
		if(obj.href.search(/module/i)!=-1 && obj.href.search(/CourseID/i)!=-1){
			//Module code
			gotModuleCode = addToTitle($(obj).text().replace(/\(.*\)/g,""));
			return false;
		}
	});

	//Handle exceptions/hacks
	//Forum
	if(document.URL.search(/ForumID/i)!=-1){
		addToTitle("Forum");
		//Check if we're in a thread
		if(document.URL.search(/board_read/i)!=-1){
			addToTitle(": " + document.querySelector("#ctl00_ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_ContentPlaceHolder1_lvPosts_ctrl0_divPostTitle").innerHTML.replace(/Title.*: /g,"").replace("&nbsp;",""),true);
			skipBreadcrumb = true;
		}
		$("div.navbar-btn").prepend("<span style='margin-right: 10px;color:#D9534F'>Unread: " + $("#ctl00_ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_ContentPlaceHolder1_divUnread").text() + "</span>");
		$("#ctl00_ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_ContentPlaceHolder1_div1").remove();
		if(!skipBreadcrumb) addToTitle(":",true);
	}
	//My Usage: intervene only when in module subpage
	if(document.URL.search(/analytics/i)!=-1){
		if(document.URL.search(/CourseID/i)!=-1){
			$.each($("ul.breadcrumb > li > a[href]"),function(i,obj){
				if(obj.href.search(/CourseID/i)!=-1){
					addToTitle($(obj).text());
					return false;
				}
			});
			addToTitle("Usage:");
		}
	}

	//Otherwise just find last item on breadcrumb
	if(!skipBreadcrumb){
		addToTitle($("ul.breadcrumb > li").filter(":last").text());
	}

	//Replace title if we have a better one
	if(betterTitle.trim()!=="") document.title = betterTitle;
}