/*
  Cytube Mention History script
  zeratul (biggles-)
  github.com/zeratul0
  v1.062
  1.062 -- Fixed another error I forgot to change
  1.061 -- Fixed a logic error (bad CSS selector)
  1.06 -- Implemented pagination.
  1.05 -- Fix options resetting if their elements aren't found
  1.04 -- Ignored users are now.. ignored.
  1.03 -- Autoscroll to bottom of messages when modal is opened. Save button causes messages to flash green, saving messages that are already saved will flash red instead of creating a popup.
          Message box border will be red if a new message is received while the modal is open. Scrolling all the way down will remove it.
*/

(()=>{
  if (CLIENT.mentionHistory === undefined) {
    CLIENT.mentionHistory = {
      'enabled': true,
      'messages': [],
      'page_all': 1,
      'page_saved': 1,
      'pageSize': 50,
      'saved': [],
      'savedWasOpened': false,
      'max': 200,
      'unique': true,
      'ver': "1.062"
    };
  } else {
    return console.error("Tried to load Mention History add-on, but CLIENT.mentionHistory already exists (did it load already?)");
  }

  function getSubArray(arr, page, pageSize) {
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 1;
    var upper = pageSize*page,
      lower = upper - pageSize;
    setPageLabel(arr,page,pageSize);
    return arr.slice(lower, upper);
  }
  function setPageLabel(arr, page, pageSize) {
    if (arr.length === 0) {
      $('#mh-pageslbl').text("0 messages");
    } else {
      var upper = pageSize*page,
        lower = upper - pageSize + 1;
      if (upper > arr.length) upper = arr.length;
      $('#mh-pageslbl').text(lower + " - " + upper + " of " + arr.length + " messages");
    }
  }
  var loadingPage = false;

  CLIENT.mentionHistoryFns = {
    'load':()=>{
      var opts = getOpt(CHANNEL.name + "_mentionHistory");
      if (opts)
        CLIENT.mentionHistory = opts;
      
      //for users missing new settings prior to 1.06
      if (!CLIENT.mentionHistory.hasOwnProperty("pageSize"))
        CLIENT.mentionHistory["pageSize"] = 50;

      if (!CLIENT.mentionHistory.hasOwnProperty("page_all"))
        CLIENT.mentionHistory["page_all"] = Math.max(1,Math.ceil(CLIENT.mentionHistory.messages.length/CLIENT.mentionHistory.pageSize));

      if (!CLIENT.mentionHistory.hasOwnProperty("page_saved"))
        CLIENT.mentionHistory["page_saved"] = Math.max(1,Math.ceil(CLIENT.mentionHistory.saved.length/CLIENT.mentionHistory.pageSize));

      //1.02 or 1.03
      if (!CLIENT.mentionHistory.hasOwnProperty("saved"))
        CLIENT.mentionHistory["saved"] = [];
      
      CLIENT.mentionHistoryFns.validMax();
      CLIENT.mentionHistoryFns.fillModal(true);
      CLIENT.mentionHistoryFns.fillSaved(true);
      CLIENT.mentionHistoryFns.updateModal();
    },
    'save':()=>{
      if (document.querySelector("#mh-enable") && document.querySelector("#mh-unique") && document.querySelector("#mh-maxmsgs")) {
        CLIENT.mentionHistory.enabled = $('#mh-enable').prop('checked');
        CLIENT.mentionHistory.unique = $('#mh-unique').prop('checked');
        CLIENT.mentionHistory.max = parseInt($('#mh-maxmsgs').val());
      }
      CLIENT.mentionHistoryFns.validMax();
      /*
      if (document.querySelector("#mentionModal"))
      while ($('#mentionModal #mh-List div').length > CLIENT.mentionHistory.max)
      $('#mentionModal #mh-List div').eq(0).remove();
      */
      var msgs = CLIENT.mentionHistory.messages;
      if (msgs.length > CLIENT.mentionHistory.max) {
        CLIENT.mentionHistory.messages = msgs.slice(msgs.length - CLIENT.mentionHistory.max, msgs.length);
        CLIENT.mentionHistoryFns.fillModal(false);
      }
      CLIENT.mentionHistoryFns.updatePageNumbers();
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
            CLIENT.mentionHistoryFns.fillModal(false);
            CLIENT.mentionHistoryFns.updatePageNumbers();
            return;
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
            CLIENT.mentionHistoryFns.fillSaved(false);
            CLIENT.mentionHistoryFns.updatePageNumbers();
            return;
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

        var msgs = CLIENT.mentionHistory.messages;
        if (msgs.length > CLIENT.mentionHistory.max) {
          CLIENT.mentionHistory.messages = msgs.slice(msgs.length - CLIENT.mentionHistory.max, msgs.length);
          CLIENT.mentionHistoryFns.fillModal(false);
        } else if ($('#mentionModal #mh-List>div').length < CLIENT.mentionHistory.pageSize)
          $('#mentionModal #mh-List').append(CLIENT.mentionHistoryFns.parseMsg(data, ["save", "delete"], false));

        var pages = CLIENT.mentionHistoryFns.updatePageNumbers();

        if (!$('#mh-List').hasClass('newMsg') && ((CLIENT.mentionHistory.page_all === pages && $('#mh-List')[0].scrollHeight > $('#mh-List')[0].clientHeight) || CLIENT.mentionHistory.page_all !== pages))
          $('#mh-List').addClass('newMsg');

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
        if ($('#mentionModal #mh-saved div').length <= CLIENT.mentionHistory.pageSize)
          $('#mentionModal #mh-saved').append(CLIENT.mentionHistoryFns.parseMsg(msgObj, ["delete"], true));
        CLIENT.mentionHistoryFns.save();
        CLIENT.mentionHistoryFns.updatePageNumbers();
        return true;
      }
    },
    'fillModal':(doScroll)=>{
      $("#mentionModal #mh-List").empty();
      var sub = getSubArray(CLIENT.mentionHistory.messages, CLIENT.mentionHistory.page_all, CLIENT.mentionHistory.pageSize),
        i=0,
        list = $('#mh-List');
      for (;i<sub.length;i++){
        list.append(CLIENT.mentionHistoryFns.parseMsg(sub[i], ["save", "delete"], false));
      }
      if (doScroll)
        CLIENT.mentionHistoryFns.scrollAll();
    },
    'fillSaved':(doScroll)=>{
      $("#mentionModal #mh-saved").empty();
      var sub = getSubArray(CLIENT.mentionHistory.saved, CLIENT.mentionHistory.page_saved, CLIENT.mentionHistory.pageSize),
        i=0,
        list = $('#mh-saved');
      for (;i<sub.length;i++){
        list.append(CLIENT.mentionHistoryFns.parseMsg(sub[i], ["delete"], true));
      }
      if (doScroll)
        CLIENT.mentionHistoryFns.scrollAll();
    },
    'emptyModal':()=>{
      $('#mentionModal #mh-List').empty();
      $('#mh-List').removeClass('newMsg');
      CLIENT.mentionHistoryFns.updatePageNumbers();
    },
    'emptySavedList':()=>{
      $('#mentionModal #mh-saved').empty();
      CLIENT.mentionHistoryFns.updatePageNumbers();
    },
    'updateModal':()=>{
      CLIENT.mentionHistoryFns.validMax();
      $('#mh-enable').prop('checked', CLIENT.mentionHistory.enabled);
      $('#mh-unique').prop('checked', CLIENT.mentionHistory.unique);
      CLIENT.mentionHistoryFns.updatePageNumbers();
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
    'updatePageNumbers':(reverse)=>{
      $('#mh-pages').empty();
      var inSaved = document.getElementById('mh-saved').classList.contains("active");
      if (reverse) inSaved = !inSaved;
      var messageCount = inSaved ? CLIENT.mentionHistory.saved.length : CLIENT.mentionHistory.messages.length,
        pages = Math.ceil(messageCount/CLIENT.mentionHistory.pageSize),
        currentPage = inSaved ? CLIENT.mentionHistory.page_saved : CLIENT.mentionHistory.page_all;
      if (pages < 1) pages = 1;
      for (var i = 1; i <= pages; i++) {
        $('#mh-pages').append($("<span/>", {
          'class':i === currentPage ? 'mh-page mh-page-'+i+' currentpage' : 'mh-page mh-page-'+i,
          'text':i
        }));
        if (i < pages)
          $('#mh-pages').append('&bull;');
      }
      if ((inSaved && CLIENT.mentionHistory.page_saved > pages) || (!inSaved && CLIENT.mentionHistory.page_all > pages))
        $('.mh-page-' + pages).click();
      setPageLabel(inSaved ? CLIENT.mentionHistory.saved : CLIENT.mentionHistory.messages,currentPage,CLIENT.mentionHistory.pageSize);
      return pages;
    },
    'setHTML':()=>{
      if (!$('#mentionModal').length) {
        $('<div class="fade modal" id=mentionModal aria-hidden=true role=dialog style=display:none tabindex=-1><div class=modal-dialog><div class=modal-content><div class=modal-header><button class=close data-dismiss=modal aria-hidden=true>×</button><h4>Mention History: <span id=modal-mh-roomname>' + CHANNEL.name + '</span></h4></div><div class=modal-body id=mentionModalWrap><div class=modal-option><div class=checkbox><label for=mh-enable><input id=mh-enable type=checkbox> Enable Mention History</label><div class=modal-caption>When this is checked, chat messages containing your username will be recorded here.</div></div></div><div class=modal-option><div class=checkbox><label for=mh-unique><input id=mh-unique type=checkbox> Only save unique messages</label><div class=modal-caption>When this option is checked, new messages will not be recorded if your history contains a message with the same username and text.</div></div></div><div class=modal-option><label for=mh-maxmsgs class=numInput>Maximum Messages <input id=mh-maxmsgs type=text class=form-control placeholder=200></label><div class=modal-caption>Maximum amount of messages allowed to be recorded. Saved messages have no limit.</div></div><ul class="nav nav-tabs"><li class="active"><a href="#mh-List" data-toggle="tab" aria-expanded="true">All Messages</a></li><li class=""><a href="#mh-saved" data-toggle="tab" aria-expanded="false">Saved Messages</a></li></ul><div class="modal-scroll active" id=mh-List></div><div class="modal-scroll" id=mh-saved></div><div id=mh-pages></div><div id="mh-pageslbl">0 messages</div></div><div class=modal-footer><div class=left-warning>Settings are not applied until you click Save.</div><button class="btn btn-danger" onclick=CLIENT.mentionHistoryFns.emptySaved() type=button>Clear Saved Messages</button><button class="btn btn-danger" onclick=CLIENT.mentionHistoryFns.empty() type=button>Clear Messages</button> <button class="btn btn-primary" data-dismiss=modal onclick=CLIENT.mentionHistoryFns.save() type=button>Save</button> <button class="btn btn-primary" data-dismiss=modal onclick=CLIENT.mentionHistoryFns.updateModal() type=button>Close</button><div class=subfooter><span class=by>written by biggles-</span><span class=ver>version ' + CLIENT.mentionHistory.ver + '</span></div></div></div></div></div>').insertBefore("#pmbar");
        $('#mentionModal').on('shown.bs.modal', function() {
          CLIENT.mentionHistoryFns.scrollAll();
        });
        $('#mentionModal .nav.nav-tabs').on('click', 'li', function() {
          if (this.classList.contains("active")) return false;
            CLIENT.mentionHistoryFns.updatePageNumbers(true);
        });
        $('#mentionModal .nav.nav-tabs li').eq(1).on('click', function() {
          if (!CLIENT.mentionHistory.savedWasOpened) {
            CLIENT.mentionHistory.savedWasOpened = true;
            CLIENT.mentionHistoryFns.scrollAll();
          }
        });
        $('#mh-List').on('scroll', function() {
          var list = this;
          if (this.classList.contains("newMsg") && (list.scrollTop + list.clientHeight) >= list.scrollHeight - 8 && CLIENT.mentionHistory.page_all === Math.ceil(CLIENT.mentionHistory.messages.length / CLIENT.mentionHistory.pageSize)) {
            this.classList.remove("newMsg");
            $('#showmentionmodal').removeClass('newMsg');
          }
        });
        $('#mh-pages').on("click", ".mh-page", function() {
          if (loadingPage) return;
          var page = parseInt(this.innerText),
            inSaved = document.getElementById('mh-saved').classList.contains("active");
          if (isNaN(page) || (!inSaved && page === CLIENT.mentionHistory.page_all) || (inSaved && page === CLIENT.mentionHistory.page_saved)) return;
          loadingPage = true;
          if (inSaved) {
            CLIENT.mentionHistory.page_saved = page;
            CLIENT.mentionHistoryFns.fillSaved(true);
          } else {
            CLIENT.mentionHistory.page_all = page;
            CLIENT.mentionHistoryFns.fillModal(true);
          }
          $('.mh-page.currentpage').removeClass('currentpage');
          $(this).addClass('currentpage');
          loadingPage = false;
        });
      }
      if (!$('#showmentionmodal').length)
        $('ul.navbar-nav').append($('<li/>').append("<a id=showmentionmodal href=javascript:void(0) onclick=javascript:CLIENT.mentionHistoryFns.openModal()>Mention History</a>"));

      $('.head-MHCSS').remove();
      $('head').append('<style class="head-MHCSS">'+
        '#showmentionmodal.newMsg {color: red;text-shadow: 1px 0 #500, 0 1px #500, -1px 0 #500, 0 -1px #500;}'+
        '#mentionModal.modal .modal-scroll {display: none;padding: 4px;background: #161616;box-shadow: 0 -4px 10px black inset;border: 1px solid black;border-top: 0;border-bottom-left-radius: 6px;border-bottom-right-radius: 6px;width: 100%;height:310px;overflow-y: auto;margin: 0!important;border-top-left-radius: 0!important;}'+
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
        '#mentionModal .subfooter {text-align: center;color: #757575;margin-top: 3px;}'+
        '#mentionModal .subfooter .by {padding-right: 10px;border-right: 1px solid #252525}'+
        '#mentionModal .subfooter .ver {padding-left: 10px;border-left: 1px solid #4e4e4e}'+
        '#mentionModal #mh-pages {color: #555;text-align: center;padding: 2px 0;cursor: default;overflow-x: auto;}'+
        '#mentionModal .mh-page {margin: 2px 0;padding: 0 3px;cursor: pointer;color: #ddd;}'+
        '#mentionModalWrap {padding: 20px 20px 0;}'+
        '#mentionModal .mh-page.currentpage {color: red;cursor: default;}'+
        '#mentionModal .mh-page, #mentionModal #mh-pages {-moz-user-select: none;-webkit-user-select: none;-khtml-user-select: none;}'+
        '#mentionModal #mh-pageslbl {color: #777;text-align: center;padding: 0 0 2px;cursor: default;}'+
        '</style>');
    },
    'openModal':()=>{
      $('#mentionModal').modal();
      $('#showmentionmodal').removeClass('newMsg');
      CLIENT.mentionHistoryFns.updatePageNumbers();
    },
    'scrollAll':()=>{
      var list = document.getElementById('mh-List'),
        saved = document.getElementById('mh-saved');

      if (list.classList.contains("active"))
        list.scrollTop = list.scrollHeight;

      if (saved.classList.contains("active"))
        saved.scrollTop = saved.scrollHeight;
    }
  };


  CLIENT.mentionHistoryFns.setHTML();
  CLIENT.mentionHistoryFns.load();

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
