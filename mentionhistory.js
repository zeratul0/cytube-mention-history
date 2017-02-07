(()=>{
if (CLIENT.mentionHistory === undefined) {
    CLIENT.mentionHistory = {
        'enabled' : true,
        'messages': [],
        'max'     : 200,
        'unique'  : true
    };
} else {
    return console.error("Tried to load Mention History add-on, but CLIENT.mentionHistory already exists (did it load already?)");
}
    
CLIENT.mentionHistoryFns = {
    'load'  :()=>{
                if (localStorage.getItem(CHANNEL.name + "_mentionHistory"))
                    CLIENT.mentionHistory = JSON.parse(localStorage.getItem(CHANNEL.name + "_mentionHistory"));
                CLIENT.mentionHistoryFns.validMax();
                CLIENT.mentionHistoryFns.fillModal();
                CLIENT.mentionHistoryFns.updateModal();
            },
    'save'  :()=>{
                CLIENT.mentionHistory.enabled = $('#mh-enable').prop('checked');
                CLIENT.mentionHistory.unique = $('#mh-unique').prop('checked');
                CLIENT.mentionHistory.max = parseInt($('#mh-maxmsgs').val());
                CLIENT.mentionHistoryFns.validMax();
                
                while ($('#mentionModal #mh-List div').length > CLIENT.mentionHistory.max) {
                    $('#mentionModal #mh-List div').eq(0).remove();
                }
                const msgs = CLIENT.mentionHistory.messages;
                if (msgs.length > CLIENT.mentionHistory.max)
                    CLIENT.mentionHistory.messages = msgs.slice(msgs.length - CLIENT.mentionHistory.max, msgs.length);
                localStorage.setItem(CHANNEL.name + "_mentionHistory", JSON.stringify(CLIENT.mentionHistory));
            },
    'validMax':()=>{
                if (isNaN(CLIENT.mentionHistory.max) || typeof CLIENT.mentionHistory.max !== "number" || CLIENT.mentionHistory.max < 1) {
                    CLIENT.mentionHistory.max = 200;
                }
                $('#mh-maxmsgs').val(CLIENT.mentionHistory.max);
            },
    'parseMsg':(msgObj)=>{
                if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time'])
                    return '<div class="chat-msg-' + msgObj.username + '"><span class="timestamp">[' + new Date(msgObj.time).toString().split(' ').slice(0,5).join(' ') +
                           '] </span><span><strong class="username">' + msgObj.username + ': </strong></span><span>' + msgObj.msg + '</span></div>';
            },
    'newMsg':(data)=>{
                if (CLIENT.mentionHistory.enabled && data.msg && data.username && CLIENT.name && ~data.msg.toLowerCase().indexOf(CLIENT.name.toLowerCase())) {
                    const message = data.msg.toLowerCase(),
                          user = data.username.toLowerCase(),
                          me = CLIENT.name.toLowerCase(),
                          _this = CLIENT.mentionHistory;
                          
                    if (user === "[server]" || user === me) return;
                    CLIENT.mentionHistoryFns.validMax();
                    if (_this.unique) {
                        let i=0;
                        for (;i<_this.messages.length;i++) {
                            if (_this.messages[i].msg.toLowerCase() === message && _this.messages[i].username.toLowerCase() === user) {
                                return console.debug("mentionHistory: Message sent by " + data.username + " ignored, only recording unique messages");
                            }
                        }
                    }
                    CLIENT.mentionHistory.messages.push(data);
                    
                    const msgs = CLIENT.mentionHistory.messages;
                    if (msgs.length > CLIENT.mentionHistory.max)
                        CLIENT.mentionHistory.messages = msgs.slice(msgs.length - CLIENT.mentionHistory.max, msgs.length);
                    
                    $('#mentionModal #mh-List').append(CLIENT.mentionHistoryFns.parseMsg(data));
                    CLIENT.mentionHistoryFns.save();
                }
            },
    'fillModal':()=>{
                $('#mentionModal #mh-List').empty();
                let i=0,
                    HTML="";
                const msgs=CLIENT.mentionHistory.messages;
                for (;i<msgs.length;i++){
                    HTML+=CLIENT.mentionHistoryFns.parseMsg(msgs[i]);
                }
                $('#mentionModal #mh-List').html(HTML);
            },
    'emptyModal':()=>{
                $('#mentionModal #mh-List').empty();
            },
    'updateModal':()=>{
                CLIENT.mentionHistoryFns.validMax();
                $('#mh-enable').prop('checked', CLIENT.mentionHistory.enabled);
                $('#mh-unique').prop('checked', CLIENT.mentionHistory.unique);
            },
    'empty' :()=>{
                if (!confirm('Are you sure you want to permanently delete your mention history for: "' + CHANNEL.name + '"?')) return;
                CLIENT.mentionHistory.messages = [];
                CLIENT.mentionHistoryFns.save();
                CLIENT.mentionHistoryFns.emptyModal();
            },
    'setHTML':()=>{
        
                if (!$('#mentionModal').length)
                    $('<div class="fade modal" id=mentionModal aria-hidden=true role=dialog style=display:none tabindex=-1><div class=modal-dialog><div class=modal-content><div class=modal-header><button class=close data-dismiss=modal aria-hidden=true>×</button><h4>Mention History: <span id=modal-mh-roomname>' + CHANNEL.name + '</span></h4></div><div class=modal-body id=mentionModalWrap><div class=modal-option><div class=checkbox><label for=mh-enable><input id=mh-enable type=checkbox> Enable Mention History</label><div class=modal-caption>Saves chat messages containing your username.</div></div></div><div class=modal-option><div class=checkbox><label for=mh-unique><input id=mh-unique type=checkbox> Only save unique messages</label><div class=modal-caption>If this is enabled and a given message has the exact same username and message as another message in your history, the message is ignored.</div></div></div><div class=modal-option><label for=mh-maxmsgs class=numInput>Maximum Messages <input id=mh-maxmsgs type=text class=form-control placeholder=200></label><div class=modal-caption>Maximum amount of messages allowed to be saved.</div></div><div class=modal-scroll id=mh-List></div></div><div class=modal-footer><div class=left-warning>Settings are not applied until you click Save.</div><button class="btn btn-danger" onclick=CLIENT.mentionHistoryFns.empty() type=button>Clear Messages</button> <button class="btn btn-primary" data-dismiss=modal onclick=CLIENT.mentionHistoryFns.save() type=button>Save</button> <button class="btn btn-primary" data-dismiss=modal onclick=CLIENT.mentionHistoryFns.updateModal() type=button>Close</button><div class=subfooter><span class=by>written by zeratul</span><span class=ver>version 1.0</span></div></div></div></div></div>').insertBefore("#pmbar");
                if (!$('#showmentionmodal').length)
                    $('ul.navbar-nav').append($('<li/>').append("<a id=showmentionmodal href=javascript:void(0) onclick=javascript:$('#mentionModal').modal()>Mention History</a>"));
                
                $('.head-MHCSS').remove();
                $('head').append('<style class="head-MHCSS">'+
                                '.modal .modal-scroll {padding: 4px;background: #161616;box-shadow: 0 0 10px black inset;border: 1px solid black;border-radius: 6px;width: 100%;height:310px;overflow-y: auto;margin-top: 30px;}'+
                                '.modal #mh-maxmsgs {display: inline-block;margin-left: 10px;width: 100px;}'+
                                '.modal label.numInput {min-height: 20px;padding-left: 20px;margin-bottom: 0;font-weight: 400;}'+
                                '.modal .left-warning {float: left;padding: 10px 12px;font-size: 13px;color: #ff8f8f}'+
                                '.modal .modal-caption {font-size: 13px;text-indent: 35px;color: #8f9cad}'+
                                '#mentionModal .subfooter {text-align: center;color: #757575}'+
                                '#mentionModal .subfooter .by {padding-right: 10px;border-right: 1px solid #252525}'+
                                '#mentionModal .subfooter .ver {padding-left: 10px;border-left: 1px solid #4e4e4e}'+
                                '</style>');
            }
};


CLIENT.mentionHistoryFns.setHTML();
CLIENT.mentionHistoryFns.load();
CLIENT.mentionHistoryFns.fillModal();
CLIENT.mentionHistoryFns.updateModal();
    
socket.on("chatMsg", function(data)
{
    CLIENT.mentionHistoryFns.newMsg(data);
});

$(window).unload(function()
{
    CLIENT.mentionHistoryFns.save();
});
})();
