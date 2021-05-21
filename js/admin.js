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

var ws_port = document.getElementById("ws_port").value;
// const ws = new WebSocket('ws://drawbridgecreativegames.com:' + ws_port);
const ws = new WebSocket('ws://192.168.0.16:' + ws_port);

ws.onmessage = function(msg) {
  let err = false;
  let resp = JSON.parse(msg.data);
  let user_json = null;
  let ura, urp, saved_games, sgl, active_games, agl = null;

  if (resp[0] && resp[0].user) {
    user_json = resp[0].user;
    ura = document.getElementById("user_role_admin");
    urp = document.getElementById("user_role_player");
    user_json.role & 1 ? urp.checked = true : urp.checked = false;
    user_json.role & 2 ? ura.checked = true : ura.checked = false;
  }

  if (resp[0] && resp[0].saved_games) {
    saved_games = resp[0].saved_games;
    sgl = document.getElementById("user_saved_games_lst");
    while (sgl.options.length > 0)
      sgl.remove(0);
    saved_games.forEach((item, i) => {
      var option = document.createElement('option');
      option.text = item.name;
      sgl.add(option, null);
    });

  }

  if (resp[0] && resp[0].active_games) {
    active_games = resp[0].active_games;
    agl = document.getElementById("user_active_games_lst");
    while (agl.options.length > 0)
      agl.remove(0);
    active_games.forEach((item, i) => {
      var option = document.createElement('option');
      option.text = item;
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

}

init();
