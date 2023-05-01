/*
* Let's Quibble!
* Richard Vassilaros
* copyright 2021
*/

const is_debug = document.getElementById("is_debug").value;
const is_local = document.getElementById("is_local").value;

function clicked_logout_btn(event) {

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/logout", true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/";
        // console.log("clicked_logout_btn.callback port: " + data_port);
      }
  }

  // console.log("clicked_logout_btn port: " + data_port);
  xhr.send(null);
}

function clicked_home_btn(event) {
  var user = document.getElementById("user").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/home_page?n=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/home_page?n=" + user;
      }
  }

  // console.log("clicked_logout_btn port: " + data_port);
  xhr.send(null);
}

function clicked_peek_email(event) {
  var email = document.getElementById("admin_email").value;
  let subj = "peek output";
  if (editor) {
    console.log("blah");
    let body = JSON.stringify(editor.get());
    // let body = editor.get();
    // let call_str = "mailto:" + email + "?subject=" + subj + "&body=" + "[{blah : \"blah\"}]"; // body;
    // let call_str = "mailto:gringopiranha@gmail.com?subject=blah blah&body=[{also blah}]";
    // window.open(`${call_str}`);
    var jsonWindow = window.open("", "Captured JSON");
    jsonWindow.document.write(body); 
  }
}

function clicked_players_email_btn(event) {
  var body = document.getElementById("players_email_body").value;
  var subj = document.getElementById("players_email_subj").value;

  if (subj) {
    data_ws.send(JSON.stringify([
      {"active_players_email_subj" : subj,
        "active_players_email_body" : body }]));
  }
}

function changed_user(event) {
  let new_user = event.currentTarget.labels[0].innerText;
  var user = document.getElementById("user").value;

  console.log("admin.changed_user: user: " + new_user);
  // note - *always* an array of hashes
  data_ws.send(JSON.stringify([{"change_user" : new_user}]));
}

function clicked_user_save_btn(event) {
  let id_stuff = event.currentTarget.id.split("_");
  let user_id = id_stuff[3];

  let rp = document.getElementById("user_role_player").checked;
  let ra = document.getElementById("user_role_admin").checked;
  let dn = document.getElementById("user_display_name").value; 
  let em = document.getElementById("user_email").value;
  let flc = document.getElementById("user_failed_login_count").value;
  let llk = document.getElementById("user_last_lockout").value;
  let llg = document.getElementById("user_last_login").value;
  
  let ret_val = {"id" : user_id,
    "role_player" : rp,
    "role_admin" : ra,
    "display_name" : dn,
    "email" : em,
    "failed_login_count" : flc,
    "last_lockout" : llk,
    "last_login" : llg};

  // save
  data_ws.send(JSON.stringify([{"save_user" : ret_val}]));
}

function clicked_user_delete_btn(event) {
  let id_stuff = event.currentTarget.id.split("_");
  let user_id = id_stuff[3];

}

function clicked_user_logout_btn(event) {
  let id_stuff = event.currentTarget.id.split("_");
  let user_id = id_stuff[3];

  // remove user from admin lists
  
  console.log("admin.logout user: user: " + user_id);
  // note - *always* an array of hashes
  data_ws.send(JSON.stringify([{"logout_user" : user_id}]));
}

function setup_chat() {
  cur_chat_port = event.currentTarget.selectedOptions[0].value;
  let game_name = event.currentTarget.selectedOptions[0].text;

  if (cur_chat_port) {
    let opts = [];
    peek_game ? opts[0] = "peek" : opts[0] = "no_peek";

    if (is_local == "true")
      cur_chat_ws = new WebSocket('ws://192.168.0.16:' + cur_chat_port, opts);
    else
      cur_chat_ws = new WebSocket('ws://letsquibble.net:' + cur_chat_port);

    cur_chat_ws.onmessage = function(msg) {
      let chat = document.getElementById("chat_text");
      let resp = JSON.parse(msg.data);
      let json = null;
      if (resp && resp.peek) {
        var container = document.getElementById("jsoneditor");
        var options = {
            mode: 'tree',
            name : 'PlayData'
        };
        // if this is peek data, just prepend it
        if (editor) {
          json = editor.get();
          editor.destroy();
        }
        if (json && Array.isArray(json))
          json.unshift(resp);
        else
          json = [resp];
        editor = new JSONEditor(container, options);
        editor.set(json);
      } 
      else {
        chat.innerHTML += "<br><br><b>" + resp[1].player + "</b>:<br>" + resp[2].info;
        console.log("admin: in onmessage: data = " + msg.data);
      }
    }

    cur_chat_ws.onopen = function() {
      // retrieve the active_game associated with the current chat - this will
      // come back through data_ws.onmessage
      data_ws.send(JSON.stringify([{ "get_active_game" : game_name }]));
    };
    cur_chat_ws.onerror = function(msg) {
      console.log("in get socket: error " + msg);
    };
    cur_chat_ws.onclose = function(msg) {
      console.log("in get socket: close " + msg);
    };
  }
}

function changed_active_game(event) {
  setup_chat();

  console.log("just who is that masked event?")
}

function clicked_view_chat_btn(event) {
  let chat = document.getElementById("chat_view");
  let game = document.getElementById("data_view");

  game.style.display = 'none';
  chat.style.display = 'block';
}

function clicked_view_game_data_btn(event) {
  let chat = document.getElementById("chat_view");
  let game = document.getElementById("data_view");

  game.style.display = 'block';
  chat.style.display = 'none';
}

function clicked_broadcast_btn(event) {

  // get all active_games
  let ags = document.getElementById("all_active_games_lst");
  let txt = document.getElementById("chat_send_text");
  let broadcast_port;
  let broadcast_ws;
  let msg = [];

  if (txt && ags) {
    for (i=1; i< ags.options.length; i++) {
      broadcast_port = ags.options[i].value;
      broadcast_msg = [];
      broadcast_msg.push({"type" : "chat"});
      broadcast_msg.push({"player" : "sysadmin"});
      broadcast_msg.push({"info" : txt.value});

      if (is_local == "true")
        broadcast_ws = new WebSocket('ws://192.168.0.16:' + broadcast_port);
      else
        broadcast_ws = new WebSocket('ws://letsquibble.net:' + broadcast_port);
    }
  }

  broadcast_ws.onmessage = function(msg) {
    let chat = document.getElementById("chat_text");
    let resp = JSON.parse(msg.data);
    chat.innerHTML += "<br><br><b>" + resp[1].player + "</b>:<br>" + resp[2].info;
    console.log("broadcast_ws in onmessage: data = " + msg.data);
  }

  broadcast_ws.onopen = function() {
    broadcast_ws.send(JSON.stringify(msg));
  };
  broadcast_ws.onerror = function(msg) {
    console.log("broadcast_ws in get socket: error " + msg);
  };
  broadcast_ws.onclose = function(msg) {
    console.log("broadcast_ws in get socket: close " + msg);
  };
}

function clicked_peek_chk(event) {
  let peek = document.getElementById("peek_chk");
  let json = [];

  peek.checked ? peek_game = true : peek_game = false;
  
  if (cur_chat_port) {
    json.push({"type" : "peek"});
    json.push({"state" : "on"});
    cur_chat_ws.send(JSON.stringify(json));
  }
  else {
    json.push({"type" : "peek"});
    json.push({"state" : "off"});
    cur_chat_ws.send(JSON.stringify(json));
  }
}

function clicked_chat_send_btn(event) {

  if (!cur_chat_port) {
    window.alert("No chat port set up!")
    return;
  }

  let txt = document.getElementById("chat_send_text");
  if (txt && user) {
    let msg = [];
    msg.push({"type" : "chat"});
    msg.push({"player" : "sysadmin"});
    msg.push({"info" : txt.value});
    txt.value = "";

    cur_chat_ws.send(JSON.stringify(msg));
  }
}

function handle_roles(resp) {
  let user_json = null;
  let ura, urp = null;

  // user roles
  if (resp[0] && resp[0].user) {
    user_json = resp[0].user;
    ura = document.getElementById("user_role_admin");
    urp = document.getElementById("user_role_player");
    user_json.role & 1 ? urp.checked = true : urp.checked = false;
    user_json.role & 2 ? ura.checked = true : ura.checked = false;
  }
}

function handle_game_lists(resp) {
  let saved_games, sgl, active_games, agl = null;

  // user saved games
  if (resp[0] && resp[0].saved_games) {
    saved_games = resp[0].saved_games;
    sgl = document.getElementById("user_saved_games_lst");
    while (sgl.options.length > 0)
      sgl.remove(0);

    var option = document.createElement('option');
    option.text = "No Selection";
    option.value = -1;
    sgl.add(option, -1);
    saved_games.forEach((item, i) => {
      option = document.createElement('option');
      option.text = item.name;
      option.value = i;
      sgl.add(option, null);
    });

  }

  if (resp[0] && resp[0].active_games) {
    active_games = resp[0].active_games;
    agl = document.getElementById("user_active_games_lst");
    while (agl.options.length > 0)
      agl.remove(0);
    var option = document.createElement('option');
    option.text = "No Selection";
    option.value = -1;
    agl.add(option, null);
    active_games.forEach((item, i) => {
      option = document.createElement('option');
      option.text = item.name;
      option.value = item.port;
      agl.add(option, null);
    });
  }
}

let months = {
  "Jan" : "01",
  "Feb" : "02",
  "Mar" : "03",
  "Apr" : "04",
  "May" : "05",
  "Jun" : "06",
  "Jul" : "07",
  "Aug" : "08",
  "Sep" : "09",
  "Oct" : "10",
  "Nov" : "11",
  "Dec" : "12"
}
function get_formatted_datetime(db_dt) {
  //  db_dt is in this format:
  //    Sun Jun 13 2021 13:35:54 GMT-0700 (Pacific Daylight Time)
  //  change to this format:
  //    yyyy-MM-ddThh:mm 
  let parts = null;
  let ret_val = "1864-09-11T09:32";

  if (db_dt) {
    let parts = db_dt.split(" ");
    let day = parts[2];
    ret_val = parts[3] + "-" + months[parts[1]] + "-" + day; 
    ret_val += "T" + parts[4];
  }

  return ret_val;
}

function handle_general_data(resp) {
  let user = resp && resp[0] ? resp[0].user : null;

  if (user) {
    let el = document.getElementById("user_display_name");
    el.value = user.display_name;
    el = document.getElementById("user_email");
    el.value = user.email;
    el = document.getElementById("user_failed_login_count");
    el.value = user.failed_login_count ? user.failed_login_count : 0;
    el = document.getElementById("user_last_lockout");
    el.value = get_formatted_datetime(user.last_lockout_date);
    el = document.getElementById("user_last_login");
    el.value = get_formatted_datetime(user.last_login_date);

  }
}

function handle_user_data(resp) {
  handle_roles(resp);
  handle_game_lists(resp);
  handle_general_data(resp);
}

// sysadmin can chat with players in an active game
// set in the changed_active_game call back
var cur_chat_port;
var cur_chat_ws;
// peek at game traffic - use the chat channel for display
var peek_game;

var data_port = document.getElementById("data_port").value;

var data_ws;
if (is_local == "true")
  data_ws = new WebSocket('ws://192.168.0.16:' + data_port);
else
  data_ws = new WebSocket('ws://letsquibble.net:' + data_port);

var editor = null;
data_ws.onmessage = function(msg) {
  let err = false;
  let resp = JSON.parse(msg.data);

  if (resp.type && resp.type == "view_game_json") {
    let all_content = [];
    resp.agame.game = resp.game;
    var container = document.getElementById("jsoneditor");
    container.innerHTML = "";
    var tree = jsonTree.create(resp.agame, container);

// Expand all (or selected) child nodes of root (optional)
    // tree.expand(function(node) {
      // return node.childNodes.length < 2 || node.label === 'phoneNumbers';
    // });

    // var options = {
    //     schema: {
    //       type: "object",
    //       title: "Game",
    //       properties: {
    //         _id: Object,
    //         name_time: {
    //           type: "string"
    //         },
    //         name: {
    //           type: "string"
    //         },
    //         pass_count: {
    //           type: "integer"
    //         },
    //         played_tiles : Array,
    //         player1 : Object,
    //         player2 : Object,
    //         plays : Array,
    //         tile_pool : Array,
    //         words : Array
    //       }
    //     },
    //     mode: 'tree',
    //     name : 'ActiveGame'
    // };
    
    // if (editor) editor.destroy();

    // editor = new JSONEditor((container), options);
    // editor.load(resp.agame);
    // editor = new JSONEditor(container, options)
    //   .then((editor) => {
    //     all_content.push(resp.agame);
    //     editor.setValue(all_content);
    //     })
    //   .catch((e) => {
    //     console.warn("activegame.delete_game: ", e);
    //   });
  }
  else {
    handle_user_data(resp);
  }
  // console.log("admin: in onmessage: data = " + msg.data);
  // console.dir(resp);
}

data_ws.onopen = function() {
  // data_ws.send("daddy's HOOOME!!");
};
data_ws.onerror = function(msg) {
  console.error("in get socket: error " + msg);
};
data_ws.onclose = function(msg) {
  console.log("in get socket: close " + msg);
};

function init() {

  let el = document.getElementById('logout_btn');
  if (el) {
    el.addEventListener("click", clicked_logout_btn);
  }

  el = document.getElementById('home_btn');
  if (el) {
    el.addEventListener("click", clicked_home_btn);
  }

  let us = document.getElementsByClassName('user_radio');
  for (let i = 0; i<us.length; i++) {
    us[i].addEventListener("change", changed_user);
  }

  el = document.getElementById("user_logout_btn");
  if (el) {
    el.addEventListener("clicked", clicked_user_logout_btn);
  }
  
  el = document.getElementById("user_active_games_lst");
  if (el) {
    el.addEventListener("change", changed_active_game);
  }

  el = document.getElementById("chat_send_btn");
  if (el) {
    el.addEventListener("click", clicked_chat_send_btn);
  }

  el = document.getElementById("broadcast_btn");
  if (el) {
    el.addEventListener("click", clicked_broadcast_btn);
  }

  el = document.getElementById("view_chat");
  if (el) {
    el.addEventListener("click", clicked_view_chat_btn);
  }

  el = document.getElementById("view_game_data");
  if (el) {
    el.addEventListener("click", clicked_view_game_data_btn);
  }

  el = document.getElementById("peek_chk");
  if (el) {
    el.addEventListener("change", clicked_peek_chk);
  }
  
  el = document.getElementById("peek_email");
  if (el) {
    el.addEventListener("click", clicked_peek_email);
  }

  el = document.getElementById("players_email_btn");
  if (el) {
    el.addEventListener("click", clicked_players_email_btn);
  }

  el = document.getElementsByClassName("user_save_btns");
  if (el) {
    for (i=0; i < el.length; i++ ) {
      el[i].addEventListener("click", clicked_user_save_btn);
    }
  }
  el = document.getElementsByClassName("user_delete_btns");
  if (el) {
    for (i=0; i < el.length; i++) {
      el[i].addEventListener("click", clicked_user_delete_btn);
    }
  }
  el = document.getElementsByClassName("user_logout_btns");
  if (el) {
    for (i=0; i < el.length; i++ ) {
      el[i].addEventListener("click", clicked_user_logout_btn);
    }
  }
}

init();
