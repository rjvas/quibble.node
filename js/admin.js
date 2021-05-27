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
        // console.log("clicked_logout_btn.callback port: " + ws_port);
      }
  }

  // console.log("clicked_logout_btn port: " + ws_port);
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

  // console.log("clicked_logout_btn port: " + ws_port);
  xhr.send(null);
}

function changed_user(event) {
  let new_user = event.currentTarget.labels[0].innerText;
  var user = document.getElementById("user").value;

  console.log("admin.changed_user: user: " + new_user);
  // note - *always* an array of hashes
  ws.send(JSON.stringify([{"change_user" : new_user}]));
}

function changed_active_game(event) {
  cur_chat_port = event.currentTarget.selectedOptions[0].value;

  if (cur_chat_port) {
    // const ws = new WebSocket('ws://drawbridgecreativegames.com:' + cur_chat_port);
    cur_chat_ws = new WebSocket('ws://192.168.0.16:' + cur_chat_port);

    cur_chat_ws.onmessage = function(msg) {
      let chat = document.getElementById("chat_text");
      let resp = JSON.parse(msg.data);
      chat.innerHTML += "<br><br><b>" + resp[1].player + "</b>:<br>" + resp[2].info;
      console.log("admin: in onmessage: data = " + msg.data);
    }

    cur_chat_ws.onopen = function() {
      // cur_chat_ws.send("daddy's HOOOME!!");
    };
    cur_chat_ws.onerror = function(msg) {
      console.log("in get socket: error " + msg);
    };
    cur_chat_ws.onclose = function(msg) {
      console.log("in get socket: close " + msg);
    };
  }

  console.log("just who is that masked event?")
}

function clicked_chat_send_btn(event) {

  if (!cur_chat_port) {
    document.alert("No chat port set up!")
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

// sysadmin can chat with players in an active game
// set in the changed_active_game call back
var cur_chat_port;
var cur_chat_ws;

var ws_port = document.getElementById("ws_port").value;
// const ws = new WebSocket('ws://drawbridgecreativegames.com:' + ws_port);
const ws = new WebSocket('ws://192.168.0.16:' + ws_port);

ws.onmessage = function(msg) {
  let err = false;
  let resp = JSON.parse(msg.data);
  let user_json = null;
  let ura, urp, saved_games, sgl, active_games, agl = null;

  // user roles
  if (resp[0] && resp[0].user) {
    user_json = resp[0].user;
    ura = document.getElementById("user_role_admin");
    urp = document.getElementById("user_role_player");
    user_json.role & 1 ? urp.checked = true : urp.checked = false;
    user_json.role & 2 ? ura.checked = true : ura.checked = false;
  }

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

  console.log("admin: in onmessage: data = " + msg.data);
  console.dir(resp);
}

ws.onopen = function() {
  // ws.send("daddy's HOOOME!!");
};
ws.onerror = function(msg) {
  console.log("in get socket: error " + msg);
};
ws.onclose = function(msg) {
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

}

init();
