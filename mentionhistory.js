/*
    Cytube Mention History script
    zeratul (biggles-)
    github.com/zeratul0
    v1.05
    1.05 -- Fix options resetting if their elements aren't found
    1.04 -- Ignored users are now.. ignored.
    1.03 -- Autoscroll to bottom of messages when modal is opened. Save button causes messages to flash green, saving messages that are already saved will flash red instead of creating a popup.
            Message box border will be red if a new message is received while the modal is open. Scrolling all the way down will remove it.
*/

(()=>{
if (CLIENT.mentionHistory === undefined) {
    CLIENT.mentionHistory = {
        'enabled' : true,
        'messages': [],
        'saved'   : [],
        'savedWasOpened': false,
        'max'     : 200,
        'unique'  : true,
        'ver'     : "1.05"
    };
} else {
    return console.error("Tried to load Mention History add-on, but CLIENT.mentionHistory already exists (did it load already?)");
}
    
CLIENT.mentionHistoryFns = {
    'load'  :()=>{
                if (getOpt(CHANNEL.name + "_mentionHistory"))
                    CLIENT.mentionHistory = getOpt(CHANNEL.name + "_mentionHistory");
                CLIENT.mentionHistoryFns.validMax();
                CLIENT.mentionHistoryFns.fillModal();
                CLIENT.mentionHistoryFns.updateModal();
            },
    'save'  :()=>{
                if (document.querySelector("#mh-enable") && document.querySelector("#mh-unique") && document.querySelector("#mh-maxmsgs")) {
                    CLIENT.mentionHistory.enabled = $('#mh-enable').prop('checked');
                    CLIENT.mentionHistory.unique = $('#mh-unique').prop('checked');
                    CLIENT.mentionHistory.max = parseInt($('#mh-maxmsgs').val());
                }
                CLIENT.mentionHistoryFns.validMax();
                if (document.querySelector("#mentionModal"))
                    while ($('#mentionModal #mh-List div').length > CLIENT.mentionHistory.max)
                        $('#mentionModal #mh-List div').eq(0).remove();

                var msgs = CLIENT.mentionHistory.messages;
                if (msgs.length > CLIENT.mentionHistory.max)
                    CLIENT.mentionHistory.messages = msgs.slice(msgs.length - CLIENT.mentionHistory.max, msgs.length);
                setOpt(CHANNEL.name + "_mentionHistory", CLIENT.mentionHistory);
            },
    'validMax':()=>{
                if (isNaN(CLIENT.mentionHistory.max) || typeof CLIENT.mentionHistory.max !== "number" || CLIENT.mentionHistory.max < 1) {
                    CLIENT.mentionHistory.max = 200;
                }
                $('#mh-maxmsgs').val(CLIENT.mentionHistory.max);
            },
    'parseMsg':(msgObj, buttons, isSaved)=>{
                if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
                    var buttonHTML = $("<div/>", {'class':"btn-group"});
                    if (buttons) {
                        if (~buttons.indexOf("save")) {
                            buttonHTML.append($("<button/>", {
                                'class':"btn btn-xs btn-success",
                                'title':"Save this message",
                                'click':function() {
                                    if (!isSaved && CLIENT.mentionHistoryFns.saveMessage(msgObj))
                                        $(this).parent().parent().addClass('blink').removeClass('blink', 50);
                                    else
                                        $(this).parent().parent().addClass('blink-red').removeClass('blink-red', 50);
                                }
                            }).append('<span class="glyphicon glyphicon-floppy-save"></span>'));
                        }
                        if (~buttons.indexOf("delete")) {
                            buttonHTML.append($("<button/>", {
                                'class':"btn btn-xs btn-danger",
                                'title':"Permanently delete this message",
                                'click':function() {
                                    if (isSaved) CLIENT.mentionHistoryFns.deleteSaved(msgObj);
                                    else CLIENT.mentionHistoryFns.deleteMsg(msgObj);
                                    $(this).parent().parent().remove();
                                }
                            }).append('<span class="glyphicon glyphicon-trash"></span>'));
                        }
                    }
                    var msg = $('<div class="chat-msg-' + msgObj.username + '"><span class="timestamp">[' + new Date(msgObj.time).toString().split(' ').slice(0,5).join(' ') +
                           '] </span><span><strong class="username">' + msgObj.username + ': </strong></span><span>' + msgObj.msg + '</span></div>');
                    if (buttonHTML.children().length > 0) msg.prepend(buttonHTML);
                    return msg;
                }
            },
    'deleteMsg':(msgObj)=>{
                if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
                    var i = 0,
                        msgs = CLIENT.mentionHistory.messages;
                    for (;i<msgs.length;i++) {
                        if (msgObj['msg'] === msgs[i]['msg'] && msgObj['username'] === msgs[i]['username'] && msgObj['time'] === msgs[i]['time']) {
                            CLIENT.mentionHistory.messages.splice(i,1);
                            CLIENT.mentionHistoryFns.save();
                        }
                    }
                }
            },
    'deleteSaved':(msgObj)=>{
                if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
                    var i = 0,
                        msgs = CLIENT.mentionHistory.saved;
                    for (;i<msgs.length;i++) {
                        if (msgObj['msg'] === msgs[i]['msg'] && msgObj['username'] === msgs[i]['username'] && msgObj['time'] === msgs[i]['time']) {
                            CLIENT.mentionHistory.saved.splice(i,1);
                            CLIENT.mentionHistoryFns.save();
                        }
                    }
                }
            },
    'newMsg':(data)=>{
                if (CLIENT.mentionHistory.enabled && data.msg && data.username && CLIENT.name && ~data.msg.toLowerCase().indexOf(CLIENT.name.toLowerCase())) {
                    var message = data.msg.toLowerCase(),
                          user = data.username.toLowerCase(),
                          me = CLIENT.name.toLowerCase(),
                          _this = CLIENT.mentionHistory;
                          
                    if (user === "[server]" || user === me) return;
                    CLIENT.mentionHistoryFns.validMax();
                    if (_this.unique) {
                        var i=0;
                        for (;i<_this.messages.length;i++) {
                            if (_this.messages[i].msg.toLowerCase() === message && _this.messages[i].username.toLowerCase() === user) {
                                return console.debug("mentionHistory: Message sent by " + data.username + " ignored, only recording unique messages");
                            }
                        }
                    }
                    CLIENT.mentionHistory.messages.push(data);
                    
                    if (!$('#showmentionmodal').hasClass('newMsg'))
                        $('#showmentionmodal').addClass('newMsg');
                    if (!$('#mh-List').hasClass('newMsg') && $('#mh-List')[0].scrollHeight > $('#mh-List')[0].clientHeight)
                        $('#mh-List').addClass('newMsg');
                        
                    
                    var msgs = CLIENT.mentionHistory.messages;
                    if (msgs.length > CLIENT.mentionHistory.max)
                        CLIENT.mentionHistory.messages = msgs.slice(msgs.length - CLIENT.mentionHistory.max, msgs.length);
                    
                    $('#mentionModal #mh-List').append(CLIENT.mentionHistoryFns.parseMsg(data, ["save", "delete"], false));
                    CLIENT.mentionHistoryFns.save();
                }
            },
    'saveMessage':(msgObj)=>{
                if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
                    var msgs = CLIENT.mentionHistory.saved;
                    var i = 0;
                    for (;i<msgs.length;i++) {
                        if (msgObj['msg'] === msgs[i]['msg'] && msgObj['username'] === msgs[i]['username'] && msgObj['time'] === msgs[i]['time']) {
                            return false;
                        }
                    }
                    CLIENT.mentionHistory.saved.push(msgObj);
                    $('#mentionModal #mh-saved').append(CLIENT.mentionHistoryFns.parseMsg(msgObj, ["delete"], true));
                    CLIENT.mentionHistoryFns.save();
                    return true;
                }
            },
    'fillModal':()=>{
                $('#mentionModal #mh-List').empty();
                var i=0,
                    list = $('#mh-List');
                var msgs=CLIENT.mentionHistory.messages;
                for (;i<msgs.length;i++){
                    list.append(CLIENT.mentionHistoryFns.parseMsg(msgs[i], ["save", "delete"], false));
                }
                CLIENT.mentionHistoryFns.scrollAll();
            },
    'fillSaved':()=>{
                $('#mentionModal #mh-saved').empty();
                var i=0,
                    list = $('#mh-saved');
                var msgs=CLIENT.mentionHistory.saved;
                for (;i<msgs.length;i++){
                    list.append(CLIENT.mentionHistoryFns.parseMsg(msgs[i], ["delete"], true));
                }
                CLIENT.mentionHistoryFns.scrollAll();
            },
    'emptyModal':()=>{
                $('#mentionModal #mh-List').empty();
                $('#mh-List').removeClass('newMsg');
            },
    'emptySavedList':()=>{
                $('#mentionModal #mh-saved').empty();
            },
    'updateModal':()=>{
                CLIENT.mentionHistoryFns.validMax();
                $('#mh-enable').prop('checked', CLIENT.mentionHistory.enabled);
                $('#mh-unique').prop('checked', CLIENT.mentionHistory.unique);
            },
    'empty' :()=>{
                if (!confirm('Are you sure you want to permanently delete your mention history for: "' + CHANNEL.name + '"? (This will not delete any messages from the Saved Messages tab.)')) return;
                CLIENT.mentionHistory.messages = [];
                CLIENT.mentionHistoryFns.save();
                CLIENT.mentionHistoryFns.emptyModal();
            },
    'emptySaved' :()=>{
                if (!confirm('Are you sure you want to permanently delete your **SAVED** mention history for: "' + CHANNEL.name + '"? (This will not delete any messages from the All Messages tab.)')) return;
                CLIENT.mentionHistory.saved = [];
                CLIENT.mentionHistoryFns.save();
                CLIENT.mentionHistoryFns.emptySavedList();
            },
    'setHTML':()=>{
        
                if (!$('#mentionModal').length) {
                    $('<div class="fade modal" id=mentionModal aria-hidden=true role=dialog style=display:none tabindex=-1><div class=modal-dialog><div class=modal-content><div class=modal-header><button class=close data-dismiss=modal aria-hidden=true>×</button><h4>Mention History: <span id=modal-mh-roomname>' + CHANNEL.name + '</span></h4></div><div class=modal-body id=mentionModalWrap><div class=modal-option><div class=checkbox><label for=mh-enable><input id=mh-enable type=checkbox> Enable Mention History</label><div class=modal-caption>When this is checked, chat messages containing your username will be recorded here.</div></div></div><div class=modal-option><div class=checkbox><label for=mh-unique><input id=mh-unique type=checkbox> Only save unique messages</label><div class=modal-caption>When this option is checked, new messages will not be recorded if your history contains a message with the same username and text.</div></div></div><div class=modal-option><label for=mh-maxmsgs class=numInput>Maximum Messages <input id=mh-maxmsgs type=text class=form-control placeholder=200></label><div class=modal-caption>Maximum amount of messages allowed to be recorded. Saved messages have no limit.</div></div><ul class="nav nav-tabs"><li class="active"><a href="#mh-List" data-toggle="tab" aria-expanded="true">All Messages</a></li><li class=""><a href="#mh-saved" data-toggle="tab" aria-expanded="false">Saved Messages</a></li></ul><div class="modal-scroll active" id=mh-List></div><div class="modal-scroll" id=mh-saved></div></div><div class=modal-footer><div class=left-warning>Settings are not applied until you click Save.</div><button class="btn btn-danger" onclick=CLIENT.mentionHistoryFns.emptySaved() type=button>Clear Saved Messages</button><button class="btn btn-danger" onclick=CLIENT.mentionHistoryFns.empty() type=button>Clear Messages</button> <button class="btn btn-primary" data-dismiss=modal onclick=CLIENT.mentionHistoryFns.save() type=button>Save</button> <button class="btn btn-primary" data-dismiss=modal onclick=CLIENT.mentionHistoryFns.updateModal() type=button>Close</button><div class=subfooter><span class=by>written by biggles-</span><span class=ver>version ' + CLIENT.mentionHistory.ver + '</span></div></div></div></div></div>').insertBefore("#pmbar");
                    $('#mentionModal').on('shown.bs.modal', function() {
                        CLIENT.mentionHistoryFns.scrollAll();
                    });
                    $('#mentionModal .nav.nav-tabs li').eq(1).on('click', function() {
                        if (!CLIENT.mentionHistory.savedWasOpened) {
                            CLIENT.mentionHistory.savedWasOpened = true;
                            CLIENT.mentionHistoryFns.scrollAll();
                        }
                    });
                    $('#mh-List').on('scroll', function() {
                        var list = this;
                        if (this.classList.contains("newMsg") && (list.scrollTop + list.clientHeight) >= list.scrollHeight - 8) {
                            this.classList.remove("newMsg");
                            $('#showmentionmodal').removeClass('newMsg');
                        }
                    });
                }
                if (!$('#showmentionmodal').length)
                    $('ul.navbar-nav').append($('<li/>').append("<a id=showmentionmodal href=javascript:void(0) onclick=javascript:CLIENT.mentionHistoryFns.openModal()>Mention History</a>"));
                
                $('.head-MHCSS').remove();
                $('head').append('<style class="head-MHCSS">'+
                                '#showmentionmodal.newMsg {color: red;text-shadow: 1px 0 #500, 0 1px #500, -1px 0 #500, 0 -1px #500;}'+
                                '#mentionModal.modal .modal-scroll {display: none;padding: 4px;background: #161616;box-shadow: 0 -4px 10px black inset;border: 1px solid black;border-top: 0;border-bottom-left-radius: 6px;border-bottom-right-radius: 6px;width: 100%;height:310px;overflow-y: auto;margin: 0!important;}'+
                                '#mentionModal.modal .modal-scroll.active {display: block!important;}'+
                                '#mentionModal.modal .btn-group .btn-success {background-image: linear-gradient(#1c6b1c,#2c822c 40%,#15a015);}'+
                                '#mentionModal.modal .btn-group .btn-success:hover {background-image: linear-gradient(#155015,#1f5d1f 40%,#0e6f0e);}'+
                                '#mentionModal.modal .nav.nav-tabs {margin-top: 30px;}'+
                                '#mentionModal.modal #mh-List.newMsg {border-color: red!important;}'+
                                '.modal .modal-scroll>div {overflow: hidden;transition: background-color .5s ease, color .5s ease;}'+
                                '.modal .modal-scroll>div.blink {transition: none!important;background-color: #3cbd3c;color: black;}'+
                                '.modal .modal-scroll>div.blink-red {transition: none!important;background-color: #a03e3e;color: black;}'+
                                '#mentionModal.modal .modal-scroll div .btn-group {margin: 0 5px;}'+
                                '.modal #mh-maxmsgs {display: inline-block;margin-left: 10px;width: 100px;}'+
                                '.modal label.numInput {min-height: 20px;padding-left: 20px;margin-bottom: 0;font-weight: 400;}'+
                                '.modal .left-warning {float: left;padding: 10px 12px;font-size: 13px;color: #ff8f8f}'+
                                '.modal .modal-caption {font-size: 13px;text-indent: 35px;color: #8f9cad}'+
                                '#mentionModal .subfooter {text-align: center;color: #757575}'+
                                '#mentionModal .subfooter .by {padding-right: 10px;border-right: 1px solid #252525}'+
                                '#mentionModal .subfooter .ver {padding-left: 10px;border-left: 1px solid #4e4e4e}'+
                                '</style>');
            },
    'openModal':()=>{
                $('#mentionModal').modal();
                $('#showmentionmodal').removeClass('newMsg');
            },
    'scrollAll':()=>{
                var list = document.getElementById('mh-List'),
                    saved = document.getElementById('mh-saved');
                    
                if (list.classList.contains("active"))
                    list.scrollTop = list.scrollHeight;
                
                if (saved.classList.contains("active"))
                    saved.scrollTop = saved.scrollHeight;
            },
};


CLIENT.mentionHistoryFns.setHTML();
CLIENT.mentionHistoryFns.load();
if (!CLIENT.mentionHistory.hasOwnProperty("saved")) {
    CLIENT.mentionHistory["saved"] = [];
}
CLIENT.mentionHistoryFns.fillModal();
CLIENT.mentionHistoryFns.fillSaved();
CLIENT.mentionHistoryFns.updateModal();
    
socket.on("chatMsg", function(data)
{
    if (IGNORED.indexOf(data.username) > -1) return;
    CLIENT.mentionHistoryFns.newMsg(data);
});

$(window).unload(function()
{
    CLIENT.mentionHistoryFns.save();
});
})();
