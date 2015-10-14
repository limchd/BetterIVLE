// ==UserScript==
// @name        BetterIVLE
// @author      limchd
// @domain      ivle.nus.edu.sg
// @include     http://ivle.nus.edu.sg/*
// @include     https://ivle.nus.edu.sg/*
// @version     0.0.3
// @grant       GM_getValue
// @grant       GM_setValue
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// ==/UserScript==

var betterTitle = "";
function addToTitle(str,noSpace){
    noSpace = typeof noSpace !== 'undefined' ? noSpace : false;
    if(str.trim()=="") return false;
    if(betterTitle=="") betterTitle=str;
    else betterTitle=betterTitle+ (noSpace ? "" : " ") +str;
    return true;
}
function parseTime(timeString,dt) {    //Not originally written by me; only made modifications to handle seconds
    if (!dt) {
        dt = new Date();
    }
    if (timeString == '') return null;

    var time = timeString.match(/(\d+)(:(\d\d)(:(\d\d))?)?\s*(p?)/i); 
    if (time == null) return null;

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

//Find out if we're in Classic or New IVLE (URL has 'v1')
var isClassic = false;
if(document.URL.search(/v1/i)==-1) isClassic=true;

//New IVLE
if(!isClassic){
    var skipRest=false;
    //Files/Workbin hack
    if(!skipRest && document.URL.search(/WorkbinID/i)!=-1){
        //Inserting our folder tree panel
        var treePanel = document.createElement("div");
        var mainPanel = document.querySelector(".panel-default");
        mainPanel.parentNode.insertBefore(treePanel,mainPanel);
        
        //HTML of treePanel
        $(treePanel).attr("id","BIVLE_treePanel").addClass("panel").css({"float":"left","width":"25%"});
        treePanel.innerHTML = "<div class='panel-heading'><img src='/v1/Content/Images/treeview.png' style='vertical-align:top' /> Folders</div><div class='panel-body' style='padding:1%'><ul style='display:block;list-style:none;padding-left:0;max-height:450px;overflow-x:hidden;overflow-y:auto;' id='BIVLE_foldermenu'><li class='dropdown-header'><span class='icon-spinner'></span>&nbsp;Loading folders...</li></ul></div>";
        $("#BIVLE_treePanel .panel-heading").css("background",$(".panel-default .panel-heading").css("background"));
        
        //Getting the folders
        var currentD = new Date();
        $.get("getfoldermenu.ashx?CourseID=0be58c4a-db13-4014-98fb-8dbf4dcbefdc&_=" + currentD.getTime(), function(data){
            $("#BIVLE_foldermenu").html(data);
        });

        //Sanitising the default body panel
        mainPanel.style.float = "right";
        mainPanel.style.width = "73%";
        mainPanel.querySelector("#titleNav").innerHTML = "<span>" + mainPanel.querySelector("#titleNav .lblHead").innerHTML + "</span>";

        //skipRest = true;
    }

    //What's New hack
    if(!skipRest && document.URL.search(/whats_new/i)!=-1){
        //Check for last visited time
        var currentD = new Date();
        var oldD = new Date();
        var storedD = GM_getValue("BIVLE_WhatsNewLastVisited","undefined");
        if(storedD!="undefined"){
            oldD.setTime(storedD);
            //Search within each day
            var tempE = new Date();
            nodeList = document.querySelectorAll("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_spnStudent h3.panel-title");
            for(var i=0; i<nodeList.length; i++){
                tempE.setTime(Date.parse(nodeList[i].innerHTML));
                //Case 1: New days (new <h3> panels)
                if(tempE > oldD){
                    //TODO: check if it's an empty day afterall
                    //TODO: get better colours

                    //Highlight panel
                    nodeList[i].parentNode.style.backgroundColor="#EE2222";
                    //Highlight every entry in each new day
                    nodeList2 = nodeList[i].parentNode.parentNode.querySelectorAll("li");
                    for(var j=0; j<nodeList2.length; j++)
                        nodeList2[j].style.color="#CC2222";
                }else{
                    //Case 2: Same day (check for new items in <li>)
                    if(tempE.getDay()==oldD.getDay()){
                        nodeList2 = nodeList[i].parentNode.parentNode.querySelectorAll("li");
                        for(var j=0; j<nodeList2.length; j++){
                            //Get time
                            nodeA = nodeList2[j].querySelector("a[href]");
                            if(parseTime(nodeA.innerHTML,tempE) > oldD)
                                nodeA.parentNode.style.color="#CC2222";
                        }
                    }
                }
            }
        }
        GM_setValue("BIVLE_WhatsNewLastVisited",currentD.getTime());
        skipRest = true;
    }

    if(!skipRest){
		//Page titles hack
        var skipBreadcrumb=false;
        var gotModuleCode=false;

        //Get breadcrumb
        nodeList = document.querySelectorAll("ul.breadcrumb > li > a[href]");
        for(var i=0; i<nodeList.length; i++)
            if(nodeList[i].href.search(/module/i)!=-1 && nodeList[i].href.search(/CourseID/i)!=-1){
                //Module code
                gotModuleCode = addToTitle(nodeList[i].innerHTML.replace(/\(.*\)/g,""));
            }

        //Handle exceptions/hacks
        //Forum
        if(document.URL.search(/forum/i)!=-1){
            addToTitle("Forum");
            //Check if we're in a thread
            if(document.URL.search(/board_read/i)!=-1){
                addToTitle(": " + document.querySelector("#ctl00_ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_ContentPlaceHolder1_lvPosts_ctrl0_divPostTitle").innerHTML.replace(/Title.*: /g,"").replace("&nbsp;",""),true);
                skipBreadcrumb = true;
            }
            if(gotModuleCode) skipBreadcrumb = true;
            else if(!skipBreadcrumb) addToTitle(":",true);
        }
        //My Usage
        if(document.URL.search(/analytics/i)!=-1){
            addToTitle("Usage:");
        }

        //Otherwise just find last item on breadcrumb
        if(!skipBreadcrumb){
            nodeList = document.querySelectorAll("ul.breadcrumb > li");
            addToTitle(nodeList[nodeList.length-1].innerHTML);
        }
		
		//Replace title if we have a better one
		if(betterTitle.trim()!="") document.title = betterTitle;
    }
}
