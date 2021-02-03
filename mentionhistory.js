/*
  Cytube Mention History script
  biggles-
  github.com/deerfarce
  
  !!NOTE!! With 1.07, the CSS for this plugin was externalized into its own file. It must be @imported now.
  
  v1.08
  1.08 -- Fixes some potential issues.
  1.073 -- Added support for Xaekai's audio notice script and native notifications for nickname matching
  1.072 -- Added check for duplicate nicknames
  1.071 -- Added minimum nickname length, privatized settings and functions
  1.07 -- Added feature to allow matching user-specified nicknames. Externalized CSS.
  1.062 -- Fixed another error I forgot to change, wew
  1.061 -- Fixed a logic error.
  1.06 -- Implemented pagination.
  1.05 -- Fix options resetting if their elements aren't found
  1.04 -- Ignored users are now.. ignored.
  1.03 -- Autoscroll to bottom of messages when modal is opened. Save button causes messages to flash green, saving messages that are already saved will flash red instead of creating a popup.
          Message box border will be red if a new message is received while the modal is open. Scrolling all the way down will remove it.
*/

(()=>{
  if (window.MHLoaded === undefined) {
    window.MHLoaded = true;
  } else {
    return console.error("Tried to load Mention History add-on, but it has already been loaded.");
  }
  var loadingPage = false,
    minNameLength = 3,
    activeTab = "#mh-List",
    version = "1.08",
    MH = {
      enabled: true,
      matchOtherNames: false,
      max: 200,
      messages: [],
      names: [],
      newMessages: 0,
      page_all: 1,
      page_saved: 1,
      pageSize: 50,
      regexp: null,
      saved: [],
      savedWasOpened: false,
      unique: true
  };

  function escRegex(expString) {
    return expString.replace(/[\\$*+?.^{}()|\[\]]/g, "\\$&");
  }

  function buildMentionRegex() {
    if (MH.names.length <= 0) return null;
    var escnames = [];
    for (var i = 0; i < MH.names.length; i++) {
      if (MH.names[i].length >= minNameLength)
        escnames.push(escRegex(MH.names[i]));
    }
    return new RegExp("(" + escnames.join("|") + ")", "i")
  }

  function getSubArray(arr, page, pageSize) {
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 1;
    var upper = pageSize*page,
      lower = upper - pageSize;
    setPageLabel(arr.length,page,pageSize);
    return arr.slice(lower, upper);
  }

  function setPageLabel(arrlen, page, pageSize) {
    if (arrlen === 0) {
      $('#mh-pageslbl').text("0 messages");
    } else {
      var upper = pageSize*page,
      lower = upper - pageSize + 1;
      if (upper > arrlen) upper = arrlen;
      $('#mh-pageslbl').text(lower + " - " + upper + " of " + arrlen + " messages");
    }
  }

  function load() {
    var opts = getOpt(CHANNEL.name + "_mentionHistory");
    if (opts && typeof opts === "object" && !(opts instanceof Array)) {
      MH = opts;
      for (var i = 0; i < MH.messages.length; i++) {
        MH.messages[i].username = stripHTML(MH.messages[i].username);
        MH.messages[i].msg = stripHTML(MH.messages[i].msg);
      }
      for (var i = 0; i < MH.saved.length; i++) {
        MH.saved[i].username = stripHTML(MH.saved[i].username);
        MH.saved[i].msg = stripHTML(MH.saved[i].msg);
      }
    }
    MH["regexp"] = null;
    MH["savedWasOpened"] = false;

    //1.07
    if (!MH.hasOwnProperty("matchOtherNames"))
      MH["matchOtherNames"] = false;
    if (!MH.hasOwnProperty("names"))
      MH["names"] = [];

    //for users missing new settings prior to 1.06
    if (!MH.hasOwnProperty("pageSize"))
      MH["pageSize"] = 50;
    if (!MH.hasOwnProperty("page_all"))
      MH["page_all"] = Math.max(1,Math.ceil(MH.messages.length/MH.pageSize));
    if (!MH.hasOwnProperty("page_saved"))
      MH["page_saved"] = Math.max(1,Math.ceil(MH.saved.length/MH.pageSize));

    //1.02 or 1.03
    if (!MH.hasOwnProperty("saved"))
      MH["saved"] = [];

    validMax();
    fillModal(true);
    fillSaved(true);
    fillNames();
    updateModal();
    renderMentionButton();
    MH.regexp = buildMentionRegex();
  }

  function save() {
    if (document.querySelector("#mh-enable") && document.querySelector("#mh-unique") && document.querySelector("#mh-maxmsgs") && document.querySelector("#mh-additionalnames")) {
      MH.enabled = $('#mh-enable').prop('checked');
      MH.unique = $('#mh-unique').prop('checked');
      MH.matchOtherNames = $('#mh-additionalnames').prop('checked');
      MH.max = parseInt($('#mh-maxmsgs').val());
    }
    validMax();
    var msgs = MH.messages;
    if (msgs.length > MH.max) {
      MH.messages = msgs.slice(msgs.length - MH.max, msgs.length);
      fillModal(false);
    }
    updatePageNumbers();
    var tempreg = MH.regexp;
    MH.regexp = null;
    setOpt(CHANNEL.name + "_mentionHistory", MH);
    MH.regexp = tempreg;
  }

  function quickSave() {
    var tempreg = MH.regexp;
    MH.regexp = null;
    setOpt(CHANNEL.name + "_mentionHistory", MH);
    MH.regexp = tempreg;
  }

  function validMax() {
    if (isNaN(MH.max) || typeof MH.max !== "number" || MH.max < 1) {
      MH.max = 200;
    }
    $('#mh-maxmsgs').val(MH.max);
  }

  function parseMsg(msgObj, buttons, isSaved) {
    if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
      msgObj.username = stripHTML(msgObj.username);
      msgObj.msg = stripHTML(msgObj.msg);
      msgObj.time = /^\d+$/.test(msgObj.time) ? msgObj.time : 0;
      var buttonHTML = $("<div/>", {'class':"btn-group"});
      if (buttons) {
        if (~buttons.indexOf("save")) {
          buttonHTML.append($("<button/>", {
            'class':"btn btn-xs btn-success",
            'title':"Save this message",
            'click':function() {
              if (!isSaved && saveMessage(msgObj))
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
              if (isSaved) deleteSaved(msgObj);
              else deleteMsg(msgObj);
              $(this).parent().parent().remove();
            }
          }).append('<span class="glyphicon glyphicon-trash"></span>'));
        }
      }
      var msg = $('<div class="chat-msg-' + msgObj.username + '"><span class="timestamp">[' + new Date(msgObj.time).toString().split(' ').slice(0,5).join(' ') +
      '] </span><span><strong class="username">' + msgObj.username + ': </strong></span><span>' + msgObj.msg + '</span></div>');
      if (buttonHTML.children().length > 0) msg.prepend(buttonHTML);
      if (msgObj["meta"] && msgObj.meta["custom"]) msg.addClass("custom");
      return msg;
    }
  }

  function stripHTML(txt) {
    return txt.replace(/(\<.+?\>)+/gi, "");
  }

  function deleteMsg(msgObj) {
    if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
      var i = 0,
        msgs = MH.messages;
      for (;i<msgs.length;i++) {
        if (msgObj['msg'] === msgs[i]['msg'] && msgObj['username'] === msgs[i]['username'] && msgObj['time'] === msgs[i]['time']) {
          MH.messages.splice(i,1);
          save();
          fillModal(false);
          updatePageNumbers();
          return;
        }
      }
    }
  }

  function deleteSaved(msgObj) {
    if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
      var i = 0,
        msgs = MH.saved;
      for (;i<msgs.length;i++) {
        if (msgObj['msg'] === msgs[i]['msg'] && msgObj['username'] === msgs[i]['username'] && msgObj['time'] === msgs[i]['time']) {
          MH.saved.splice(i,1);
          save();
          fillSaved(false);
          updatePageNumbers();
          return;
        }
      }
    }
  }

  function newMsg(data) {
    if (MH.enabled && data.msg && data.username && CLIENT.name) {
      data.meta["custom"] = false;
      var nameFound = ~data.msg.toLowerCase().indexOf(CLIENT.name.toLowerCase());
      if (!nameFound) {
         if (MH.matchOtherNames && null !== MH.regexp && MH.regexp.test(data.msg)) {
           if (data.username !== CLIENT.name) {
             var lastMsg = document.querySelectorAll("#messagebuffer > div");
             lastMsg = lastMsg[lastMsg.length - 1];
             lastMsg.classList.add("nick-highlight");
             data.meta["custom"] = true;
             pingMessage(true, data.username, data.msg);
             if (window[CHANNEL.name] && window[CHANNEL.name]["audioNotice"])
              window[CHANNEL.name].audioNotice.handler["Squee"](data);
           }
         } else return;
      }
      var message = data.msg.toLowerCase(),
        user = data.username.toLowerCase(),
        me = CLIENT.name.toLowerCase(),
        _this = MH;

      if (user === "[server]" || user === me) return;
      validMax();
      if (_this.unique) {
        var i=0;
        for (;i<_this.messages.length;i++) {
          if (_this.messages[i].msg.toLowerCase() === message && _this.messages[i].username.toLowerCase() === user) {
            return console.debug("mentionHistory: Message sent by " + data.username + " ignored, only recording unique messages");
          }
        }
      }
      data.username = stripHTML(data.username);
      data.msg = stripHTML(data.msg);
      MH.messages.push(data);

      setNewMessage(++MH.newMessages);
      renderMentionButton();

      var msgs = MH.messages;
      if (msgs.length > MH.max) {
        MH.messages = msgs.slice(msgs.length - MH.max, msgs.length);
        fillModal(false);
      } else if ($('#mentionModal #mh-List>div').length < MH.pageSize) {
        $('#mentionModal #mh-List').append(parseMsg(data, ["save", "delete"], false));
      }

      var pages = updatePageNumbers();

      if (!$('#mh-List').hasClass('newMsg') && ((MH.page_all === pages && $('#mh-List')[0].scrollHeight > $('#mh-List')[0].clientHeight) || MH.page_all !== pages))
        $('#mh-List').addClass('newMsg');

      save();
    }
  }

  function saveMessage(msgObj) {
    if (msgObj && msgObj['msg'] && msgObj['username'] && msgObj['time']) {
      var msgs = MH.saved;
      var i = 0;
      for (;i<msgs.length;i++) {
        if (msgObj['msg'] === msgs[i]['msg'] && msgObj['username'] === msgs[i]['username'] && msgObj['time'] === msgs[i]['time']) {
          return false;
        }
      }
      MH.saved.push(msgObj);
      if ($('#mentionModal #mh-saved div').length <= MH.pageSize)
        $('#mentionModal #mh-saved').append(parseMsg(msgObj, ["delete"], true));
      save();
      updatePageNumbers();
      return true;
    }
  }

  function fillModal(doScroll) {
    $("#mentionModal #mh-List").empty();
    var sub = getSubArray(MH.messages, MH.page_all, MH.pageSize),
      i=0,
      list = $('#mh-List');
    for (;i<sub.length;i++){
      list.append(parseMsg(sub[i], ["save", "delete"], false));
    }
    if (doScroll)
      scrollAll();
  }

  function fillSaved(doScroll) {
    $("#mentionModal #mh-saved").empty();
    var sub = getSubArray(MH.saved, MH.page_saved, MH.pageSize),
      i=0,
      list = $('#mh-saved');
    for (;i<sub.length;i++){
      list.append(parseMsg(sub[i], ["delete"], true));
    }
    if (doScroll)
      scrollAll();
  }

  function fillNames() {
    $('#mentionModal #mh-altitemcontainer').empty();
    for (var i = 0; i < MH.names.length; i++) {
      addNewName(MH.names[i]);
    }
  }

  function emptyModal() {
    $('#mentionModal #mh-List').empty();
    $('#mh-List').removeClass('newMsg');
    updatePageNumbers();
  }

  function emptySavedList() {
    $('#mentionModal #mh-saved').empty();
    updatePageNumbers();
  }

  function updateModal() {
    validMax();
    $('#mh-enable').prop('checked', MH.enabled);
    $('#mh-unique').prop('checked', MH.unique);
    $('#mh-additionalnames').prop('checked', MH.matchOtherNames);
    updatePageNumbers();
  }

  function empty() {
    if (!confirm('Are you sure you want to permanently delete your mention history for: "' + CHANNEL.name + '"? (This will not delete any messages from the Saved Messages tab.)')) return;
    MH.messages = [];
    save();
    emptyModal();
  }

  function emptySaved() {
    if (!confirm('Are you sure you want to permanently delete your **SAVED** mention history for: "' + CHANNEL.name + '"? (This will not delete any messages from the All Messages tab.)')) return;
    MH.saved = [];
    save();
    emptySavedList();
  }

  function updatePageNumbers(targetlistID) {
    $('#mh-pages').empty();
    if (undefined === targetlistID || null === targetlistID) {
      targetlistID = activeTab;
    }
    var messageCount = pages = currentPage = 0;
    switch (targetlistID) {
      case '#mh-List':
        messageCount = MH.messages.length;
        currentPage = MH.page_all;
        break;
      case '#mh-saved':
        messageCount = MH.saved.length;
        currentPage = MH.page_saved;
        break;
      case '#mh-names':
        $("#mh-pages").text("A large amount of nicknames may adversely affect performance.");
        $("#mh-pageslbl").text("Minimum name length: " + minNameLength + " characters");
        return 0;
      default:
        $('#mh-pages').empty();
        $('#mh-pageslbl').empty();
        return 0;
    }
    pages = Math.ceil(messageCount/MH.pageSize);
    if (pages < 1) pages = 1;
    for (var i = 1; i <= pages; i++) {
      $('#mh-pages').append($("<span/>", {
        'class':i === currentPage ? 'mh-page mh-page-'+i+' currentpage' : 'mh-page mh-page-'+i,
        'text':i
      }));
      if (i < pages)
        $('#mh-pages').append('&bull;');
    }
    if (currentPage > pages)
      $('.mh-page-' + pages).click();
    setPageLabel(messageCount, currentPage, MH.pageSize);
    return pages;
  }

  function setHTML() {
    if (!$('#mentionModal').length) {
      $('<div class="fade modal" id=mentionModal aria-hidden=true role=dialog style=display:none tabindex=-1><div class=modal-dialog><div class=modal-content><div class=modal-header><button class=close data-dismiss=modal aria-hidden=true>×</button><h4>Mention History: <span id=modal-mh-roomname>' + CHANNEL.name + '</span></h4></div><div class=modal-body id=mentionModalWrap><div class=modal-option><div class=checkbox><label for=mh-enable><input id=mh-enable type=checkbox> Enable Mention History</label><div class=modal-caption>When this is checked, chat messages containing your username will be recorded here.</div></div></div><div class=modal-option><div class=checkbox><label for=mh-unique><input id=mh-unique type=checkbox> Only save unique messages</label><div class=modal-caption>When this option is checked, new messages will not be recorded if your history contains a message with the same username and text.</div></div></div><div class=modal-option><label for=mh-maxmsgs class=numInput>Maximum Messages <input id=mh-maxmsgs type=text class=form-control placeholder=200></label><div class=modal-caption>Maximum amount of messages allowed to be recorded. Saved messages have no limit.</div></div><div class="modal-option"><div class="checkbox"><label for="mh-additionalnames"><input id="mh-additionalnames" type="checkbox">Check for additional names</label><div class="modal-caption">When this is checked, messages will be saved if they contain any user-specified words/phrases/etc. Use the Additional Names tab below to edit them.</div></div></div><ul class="nav nav-tabs"><li class="active"><a href="#mh-List" data-toggle="tab" aria-expanded="true">All Messages</a></li><li><a href="#mh-saved" data-toggle="tab" aria-expanded="false">Saved Messages</a></li><li><a href="#mh-names" data-toggle="tab" aria-expanded="false">Additional Names</a></li></ul><div class="modal-scroll active" id=mh-List></div><div class="modal-scroll" id=mh-saved></div><div class="modal-noscroll" id=mh-names><div class="modal-txtcontainer"><input type="textbox" id="mh-txt-addname" placeholder="Enter a new name..."><button id="mh-btn-addname">Add</button></div><div id="mh-altitemcontainer"></div></div><div id=mh-pages></div><div id="mh-pageslbl">0 messages</div></div><div class=modal-footer><div class=left-warning>Settings are not applied until you click Save. However, changes to Additional Names are instant.</div><div class=subfooter><span class=by>written by biggles-</span><span class=ver>version ' + version + '</span></div></div></div></div></div>').insertBefore("#pmbar");
      var btns = [
        $("<button/>", {
          class:"btn btn-danger",
          click: emptySaved,
          type: "button",
          text: "Clear Saved Messages"
        }),
        $("<button/>", {
          class:"btn btn-danger",
          click: empty,
          type: "button",
          text: "Clear Messages"
        }),
        $("<button/>", {
          class:"btn btn-primary",
          'data-dismiss':"modal",
          click: save,
          type: "button",
          text: "Save"
        }),
        $("<button/>", {
          class:"btn btn-primary",
          'data-dismiss':"modal",
          click: updateModal,
          type: "button",
          text: "Close"
        })
      ];
      for (var i = 0; i < btns.length; i++) {
        btns[i].insertBefore($("#mentionModal .subfooter").eq(0));
      }
      $('#mentionModal').on('shown.bs.modal', function() {
        scrollAll();
      });
      $('#mentionModal .nav.nav-tabs').on('click', 'li', function() {
        if (this.classList.contains("active")) return false;
        activeTab = this.firstChild.attributes.href.value;
        updatePageNumbers();
      });
      $('#mentionModal .nav.nav-tabs li').eq(1).on('click', function() {
        if (!MH.savedWasOpened) {
          MH.savedWasOpened = true;
          scrollAll();
        }
      });
      $('#mh-List').on('scroll', function() {
        var list = this;
        if (this.classList.contains("newMsg") && (list.scrollTop + list.clientHeight) >= list.scrollHeight - 8 && MH.page_all === Math.ceil(MH.messages.length / MH.pageSize)) {
          this.classList.remove("newMsg");
          $('#showmentionmodal').removeClass('newMsg');
        }
      });
      $('#mh-pages').on("click", ".mh-page", function() {
        if (loadingPage) return;
        var page = parseInt(this.innerText),
          pageTable = {
            "#mh-List":MH.page_all,
            "#mh-saved":MH.page_saved
          };
        if (isNaN(page) || !pageTable.hasOwnProperty(activeTab) || page === pageTable[activeTab]) return;
        loadingPage = true;
        switch (activeTab) {
          case "#mh-List":
            MH.page_all = page;
            fillModal(true);
            break;
          case "#mh-saved":
            MH.page_saved = page;
            fillSaved(true);
            break;
          default:
            break;
        }
        $('.mh-page.currentpage').removeClass('currentpage');
        $(this).addClass('currentpage');
        loadingPage = false;
      });
      $('#mh-btn-addname').on("click", function() {
        var txtbox = $('#mh-txt-addname');
        if (txtbox.val().trim() !== "") {
          var name = txtbox.val().trim();
          if (name.length < minNameLength) {
            return window.alert("Additional nicknames must be at least " + minNameLength + " characters long.");
          }
          for (var i = 0; i < MH.names.length; i++) {
            if (MH.names[i].toLowerCase() === name.toLowerCase()) {
              return alert("That nickname already exists.");
            }
          }
          addNewName(name);
          MH.names.push(name);
          txtbox.val("");
          MH.regexp = buildMentionRegex();
        }
      });
      $('#mh-txt-addname').keydown(function(e) {
        if (e.keyCode === 13)
          $('#mh-btn-addname').click();
      });
    }
    if (!$('#showmentionmodal').length) {
      var button = $("<a/>", {
        id: "showmentionmodal",
        click: openModal,
        href: "javascript:void(0)"
      });
      $('ul.navbar-nav').append($('<li/>').append(button.append(
        '<span class="badge">~</span>'+
        '&nbsp;Mentions'+
        '&nbsp;<i class="fa fa-envelope"></i>'
      )));
      renderMentionButton();
    }
  }

  function openModal() {
    setNewMessage(0);
    $('#mentionModal').modal();
    renderMentionButton();
    updatePageNumbers();
  }
  
  //enzi
  function setNewMessage(num) {
    MH.newMessages = num;
    quickSave();
  }

  //enzi
  //optional: envelope requires FontAwesome
  function renderMentionButton() {
    let btn = $('#showmentionmodal');
    btn.find('.badge')
      .attr('class', MH.newMessages > 0 ? 'badge text-danger' : 'badge')
      .text(MH.newMessages);
    btn.find('i.fa').attr('class', 'fa ' + (MH.newMessages > 0 ? 'fa-envelope' : 'fa-envelope-open-o'));
  }

  function scrollAll() {
    var list = document.getElementById('mh-List'),
    saved = document.getElementById('mh-saved');

    if (list.classList.contains("active"))
    list.scrollTop = list.scrollHeight;

    if (saved.classList.contains("active"))
    saved.scrollTop = saved.scrollHeight;
  }

  function addNewName(name) {
    var outercell = $("<span/>", {
      class:"mh-cell"
    });
    var cell = $("<span/>", {
      class:"mh-cellcontent",
      text:name
    }).prepend(
    $("<div/>", {
      class:"btn-group"
    }).append($("<button/>", {
      'class':"btn btn-xs btn-danger",
      'title':"Delete name",
      'click':function() {
        outercell.remove();
        var names = MH.names;
        for (var i = 0; i < names.length; i++) {
          if (names[i] === name) {
            names[i] = names[names.length - 1];
            names.length--;
            MH.regexp = buildMentionRegex();
            return;
          }
        }
      }
    }).append('<span class="glyphicon glyphicon-trash"></span>')));
    if (name.length < minNameLength) {
      outercell.css("color", "red");
      outercell.attr("title", "This name is too short, and will not be used.");
    }
    $("#mh-altitemcontainer").append(outercell.append(cell));
  }
  
  setHTML();
  load();

  socket.on("chatMsg", function(data) {
    if (IGNORED.indexOf(data.username) > -1) return;
    newMsg(data);
  });

  $(window).unload(function() {
    save();
  });
})();
