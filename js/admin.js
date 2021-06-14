/*
* Heist
* Drawbridge Creative https://drawbridgecreative.com
* copyright 2021
*/

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
  xhr.open("GET", "/home_page?user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/home_page?user=" + user;
      }
  }

  // console.log("clicked_logout_btn port: " + data_port);
  xhr.send(null);
}

function changed_user(event) {
  let new_user = event.currentTarget.labels[0].innerText;
  var user = document.getElementById("user").value;

  console.log("admin.changed_user: user: " + new_user);
  // note - *always* an array of hashes
  data_ws.send(JSON.stringify([{"change_user" : new_user}]));
}

function setup_chat() {
  cur_chat_port = event.currentTarget.selectedOptions[0].value;
  let game_name = event.currentTarget.selectedOptions[0].text;

  if (cur_chat_port) {
    // cur_chat_ws = new WebSocket('ws://drawbridgecreativegames.com:' + cur_chat_port);
    cur_chat_ws = new WebSocket('ws://192.168.0.16:' + cur_chat_port);

    cur_chat_ws.onmessage = function(msg) {
      let chat = document.getElementById("chat_text");
      let resp = JSON.parse(msg.data);
      chat.innerHTML += "<br><br><b>" + resp[1].player + "</b>:<br>" + resp[2].info;
      console.log("admin: in onmessage: data = " + msg.data);
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

      // broadcast_ws = new WebSocket('ws://drawbridgecreativegames.com:' + broadcast_port);
      broadcast_ws = new WebSocket('ws://192.168.0.16:' + broadcast_port);
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
    if (day < 10)
      day = "0" + day;
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

var data_port = document.getElementById("data_port").value;
// const data_ws = new WebSocket('ws://drawbridgecreativegames.com:' + data_port);
const data_ws = new WebSocket('ws://192.168.0.16:' + data_port);

var editor = null;
data_ws.onmessage = function(msg) {
  let err = false;
  let resp = JSON.parse(msg.data);

  if (resp.type && resp.type == "view_game_json") {
    var container = document.getElementById("jsoneditor");
    var options = {
        mode: 'tree'
    };
    if (editor) editor.destroy();
    editor = new JSONEditor(container, options);
    editor.set(resp.game);
  }
  else {
    handle_user_data(resp);
  }
  console.log("admin: in onmessage: data = " + msg.data);
  console.dir(resp);
}

data_ws.onopen = function() {
  // data_ws.send("daddy's HOOOME!!");
};
data_ws.onerror = function(msg) {
  console.log("in get socket: error " + msg);
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

  el = document.getElementById("user_active_games_lst");
  el.addEventListener("change", changed_active_game);

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

}

init();
