/*
* Richard Vassilaros
* copyright 2021
*/

var ws_port = document.getElementById("ws_port").value;

function clicked_help_btn() {
  let dia = document.getElementById("help_dialog");
  dia.style.display = "block";
}

function clicked_help_ok(event) {
  let dia = document.getElementById("help_dialog");
  dia.style.display = "none";
}

function new_practice_game() {
  var user = document.getElementById("user").value;

  if (window.confirm("New practice game?")) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/new_practice_game?user=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = xhr.responseURL;
        }
    }

    xhr.send(null);
  }
}

function clicked_delete_game_btn(event) {

  var deleted = document.getElementById("games_lst");
  let option = deleted.options [deleted.selectedIndex];  
  var user = document.getElementById("user").value;

  if (deleted.selectedIndex > 0) {

    if (!window.confirm("Are you sure you want to delete this game? It cannot be undone!"))
      return;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/delete_game?game_name=" + option.text + "&user=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        // delete it from the list
        deleted.remove(deleted.selectedIndex);
        document.location.href = "/home_page?user=" + user;
      }
    }

    // console.log("clicked_games_btn port: " + ws_port);
    xhr.send(null);
  }
}

function clicked_games_btn(event) {
  var user = document.getElementById("user").value;
  var games = document.getElementById("games_lst");
  if (games.selectedIndex == 0) {
    //alert("You must select a game or start a new game!");
    return;
  }
  let option = games.options [games.selectedIndex];  

  if (option) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/load_game?game_name=" + option.text + "&user=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = this.responseURL;
      }
    }

    xhr.send(null);
  }
}

function clicked_logout_btn(event) {
  var user = document.getElementById("user").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/logout?user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/?user=" + user;
      }
  }

  xhr.send(null);
}

function clicked_add_pickup_name_btn(event) {
  var user = document.getElementById("user").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/add_pickup_name?user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/home_page?user=" + user;
      }
  }
  xhr.send(null);
}

function clicked_play_pickup_btn(event) {
  var user = document.getElementById("user").value;
  var plist = document.getElementById("pickup_lst");
  let p_name = plist[plist.selectedIndex].label;
  
  // can't play yourself with a pickup game
  if (p_name == document.getElementById("user_display_name").value)
    return;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/play_pickup_game?vs=" + p_name + "&user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
    var user = document.getElementById("user").value;
    if (xhr.readyState === 4 && xhr.status === 200) {
      document.location.href = xhr.response;
    }
  }
  xhr.send(null);
}

function clicked_admin_btn(event) {
  var user = document.getElementById("user").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/wh_admin?user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
    let user = document.getElementById("user").value;
    if (xhr.readyState === 4 && xhr.status === 200) {
      document.location.href = "/wh_admin?user=" + user;
    }
  }
  xhr.send(null);
}

function init() {

  let btn = document.getElementById('practice_btn');
  if (btn) {
    btn.addEventListener("click", new_practice_game);
  }

  btn = document.getElementById('active_games_btn');
  if (btn) {
    btn.addEventListener("click", clicked_active_games_btn);
  }

  btn = document.getElementById('games_btn');
  if (btn) {
    btn.addEventListener("click", clicked_games_btn);
  }

  btn = document.getElementById('delete_game_btn');
  if (btn) {
    btn.addEventListener("click", clicked_delete_game_btn);
  }

  btn = document.getElementById('help_btn');
  if (btn) {
    btn.addEventListener("click", clicked_help_btn);
  }

  btn = document.getElementById('help_ok_btn');
  if (btn) {
    btn.addEventListener("click", clicked_help_ok);
  }

  btn = document.getElementById('logout_btn');
  if (btn) {
    btn.addEventListener("click", clicked_logout_btn);
  }

  btn = document.getElementById('add_pickup_btn');
  if (btn) {
    btn.addEventListener("click", clicked_add_pickup_name_btn);
  }

  btn = document.getElementById('play_pickup_btn');
  if (btn) {
    btn.addEventListener("click", clicked_play_pickup_btn);
  }

  btn = document.getElementById('admin_btn');
  if (btn) {
    btn.addEventListener("click", clicked_admin_btn);
  }

}

let un = document.getElementById("user_display_name");
let user_name = un.value;

//const ws = new WebSocket('ws://letsquibble.net:' + ws_port);
const ws = new WebSocket('ws://192.168.0.16:' + ws_port);
ws.onmessage = function(msg) {
  let resp = JSON.parse(msg.data);
  // need this for vectoring control
  let type = resp.shift();
  // data is an object that may contain a simple string,
  // dereferncing as data.data or another object -
  // dereferncing as data.data.<prop name>
  let data = resp.shift();

  if (type.type == "message") {
    alert(data.data);
  }
  else if (type.type == "gamelist_add") {
    var gl = document.getElementById("games_lst");
    var opt = document.createElement("option");
    opt.text = data.data; 
    gl.options.add(opt); 
  }
  else if (type.type == "gamelist_remove") {
    var gl = document.getElementById("games_lst");
    let idx = -1;
    for (i = 0; i < gl.options.length; i++) {
      if (gl.options[i].label == data.data)
        idx = i;
    }
    if (idx != -1) {
      gl.remove(idx);
    }
  }
  else if (type.type == "pickuplist_add") {
    var pl = document.getElementById("pickup_lst");
    var opt = document.createElement("option");
    opt.text = data.data; 
    pl.options.add(opt); 
    let count = pl.options.length - 1;
    let waiting = document.getElementById("num_waiting");
    waiting.innerText = `(${count} Available)`;
  }
  else if (type.type == "pickuplist_remove") {
    var pl = document.getElementById("pickup_lst");
    var udn = document.getElementById("user_display_name").value;
    let idx = -1;
    for (i = 0; i < pl.options.length; i++) {
      if (pl.options[i].label == data.data.name)
        idx = i;
    }
    if (idx != -1) {
      pl.remove(idx);
      let count = pl.options.length - 1;
      let waiting = document.getElementById("num_waiting");
      waiting.innerText = `(${count} Available)`;
    }
    if (udn == data.data.name)
      alert(`${data.data.challenger} has accepted your challenge!`);
  }
  console.log("in socket: onmsg");
}

ws.onopen = function() {
  console.log("in socket: open");
  // ws.send("daddy's HOOOME!!");
}
ws.onerror = function(msg) {
  console.error("in socket: error " + msg);
}
ws.onclose = function(msg) {
  console.log("in socket: close " + msg);
}

init();
