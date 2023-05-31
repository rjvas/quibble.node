/*
* Richard Vassilaros
* copyright 2021
*/

const is_debug = document.getElementById("is_debug").value;
const is_local = document.getElementById("is_local").value;
const ws_addr = document.getElementById("ws_addr").value;
const ws_port = document.getElementById("ws_port").value;
// include '-' ok
const email_regex = /(?:[a-z0-9!#$%&'*+-/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*-+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

function clicked_cancel_invite_btn() {
  let dia = document.getElementById("invite_dialog");
  dia.style.display = "none";
}

function clicked_invite_btn() {
  let dia = document.getElementById("invite_dialog");
  dia.style.display = "block";
}

function clicked_edit_invites_done_btn() {
  let dia = document.getElementById("edit_invites_dialog");
  let chks = document.getElementsByClassName("invite_del_chk");
  var user = document.getElementById("user").value;
  let chk_ids = "";
  
  for (var item of chks)
    if (item.checked) chk_ids += ":" + item.id;
  if (chk_ids) chk_ids = chk_ids.slice(1);
  dia.style.display = "none";

  let xhr = new XMLHttpRequest();
  xhr.open("GET", `/edit_invitations?n=${user}&iids=${chk_ids}` , true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      document.location.href = xhr.responseURL;
      //document.location.href = "/home_page?n=" + user;
      }
  }

  xhr.send(null);
}

function clicked_cancel_edit_invites_btn() {
  let dia = document.getElementById("edit_invites_dialog");
  dia.style.display = "none";
}

function clicked_edit_invites_btn() {
  let dia = document.getElementById("edit_invites_dialog");
  dia.style.display = "block";
}

function clicked_invite_friend_btn() {
  var user = document.getElementById("user").value;
  let u_name = document.getElementById("user_name").value;
  let f_name = document.getElementById("friend_name").value;
  let f_email = document.getElementById("friend_email").value;

  if (!u_name || !f_name || !f_email)
    alert("Please insure all fields have valid information and try again");
  else if (!email_regex.test(f_email)) {
    let email_err = document.getElementById("invite_err");
    alert("Incorrectly formatted email - please try again");
  }
  else {
    let dia = document.getElementById("invite_dialog");
    dia.style.display = "none";

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `/invite_friend?n=${user}&user_name=${u_name}&friend_name=${f_name}&friend_email=${f_email}` , true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = `/home_page?n=${user}`;
        }
    }
    xhr.send(null);
  }
}

function clicked_cancel_pickup_btn() {
  let dia = document.getElementById("pickup_dialog");
  dia.style.display = "none";
}

function clicked_pickup_btn() {
  let dia = document.getElementById("pickup_dialog");
  dia.style.display = "block";
}

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
    xhr.open("GET", "/new_practice_game?n=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = xhr.responseURL;
        }
    }

    xhr.send(null);
  }
}

function clicked_remove_friend_btn(event) {

  var removed = document.getElementById("friends_lst");
  let option = removed.options [removed.selectedIndex];  
  let jsons = [];

  if (removed.selectedIndex > 0) {

    if (!window.confirm("Are you sure you want to remove this friend? It cannot be undone!"))
      return;

    jsons.push({ "type": "remove_friend"});
    jsons.push({"info": option.label});

    ws.send(JSON.stringify(jsons));
  }
}

function clicked_friends_btn(event) {
  var friends = document.getElementById("friends_lst");
  fill_friend_fields(friends);
}
function clicked_players_btn(event) {
  var players = document.getElementById("players_lst");
  fill_friend_fields(players);
}
function changed_players_opt_in(event) {
  var opt_in = event.currentTarget;

  let jsons = [];
  jsons.push({ "type": "opt_in_players_change"});
  opt_in.checked ? jsons.push({"info": true}) : jsons.push({"info": false});

  ws.send(JSON.stringify(jsons));
}

function fill_friend_fields(list) {
  let option = list.options [list.selectedIndex];  

  if (option && option.value != -1) {
    let f_name = document.getElementById("friend_name");
    f_name.value = option.text;
    let f_email = document.getElementById("friend_email");
    f_email.value = option.value;
  }
  else {
    let f_name = document.getElementById("friend_name");
    f_name.value = "";
    let f_email = document.getElementById("friend_email");
    f_email.value = "";
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
    xhr.open("GET", "/delete_game?game_name=" + option.text + "&n=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        // delete it from the list
        deleted.remove(deleted.selectedIndex);
        document.location.href = "/home_page?n=" + user;
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
    xhr.open("GET", "/load_game?game_name=" + option.text + "&n=" + user, true);
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
  xhr.open("GET", "/logout?n=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/?n=" + user;
      }
  }

  xhr.send(null);
}

function clicked_add_pickup_name_btn(event) {
  var user = document.getElementById("user").value;
  let dia = document.getElementById("pickup_dialog");
  dia.style.display = "none";

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/add_pickup_name?n=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/home_page?n=" + user;
      }
  }
  xhr.send(null);
}

function clicked_play_pickup_btn(event) {
  let dia = document.getElementById("pickup_dialog");
  dia.style.display = "none";

  var user = document.getElementById("user").value;
  var plist = document.getElementById("pickup_lst");
  let p_name = plist[plist.selectedIndex].label;
  
  // can't play yourself with a pickup game
  if (p_name == document.getElementById("user_display_name").value)
    return;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/play_pickup_game?vs=" + p_name + "&n=" + user, true);
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
  xhr.open("GET", "/wh_admin?n=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
    let user = document.getElementById("user").value;
    if (xhr.readyState === 4 && xhr.status === 200) {
      document.location.href = "/wh_admin?n=" + user;
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

  btn = document.getElementById('remove_friend_btn');
  if (btn) {
    btn.addEventListener("click", clicked_remove_friend_btn);
  }

  btn = document.getElementById('friends_lst');
  if (btn) {
    btn.addEventListener("change", clicked_friends_btn);
  }

  btn = document.getElementById('players_lst');
  if (btn) {
    btn.addEventListener("change", clicked_players_btn);
  }

  btn = document.getElementById('opt_in_players');
  if (btn) {
    btn.addEventListener("change", changed_players_opt_in);
  }

  btn = document.getElementById('edit_invites_done_btn');
  if (btn) {
    btn.addEventListener("click", clicked_edit_invites_done_btn);
  }

  btn = document.getElementById('cancel_edit_invites_btn');
  if (btn) {
    btn.addEventListener("click", clicked_cancel_edit_invites_btn);
  }

  btn = document.getElementById('edit_invites_btn');
  if (btn) {
    btn.addEventListener("click", clicked_edit_invites_btn);
  }

  btn = document.getElementById('cancel_invite_btn');
  if (btn) {
    btn.addEventListener("click", clicked_cancel_invite_btn);
  }

  btn = document.getElementById('invite_btn');
  if (btn) {
    btn.addEventListener("click", clicked_invite_btn);
  }
  
  btn = document.getElementById('invite_friend_btn');
  if (btn) {
    btn.addEventListener("click", clicked_invite_friend_btn);
  }

  btn = document.getElementById('cancel_pickup_btn');
  if (btn) {
    btn.addEventListener("click", clicked_cancel_pickup_btn);
  }

  btn = document.getElementById('pickup_btn');
  if (btn) {
    btn.addEventListener("click", clicked_pickup_btn);
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

function handle_remove_friend(friend) {
  var friends = document.getElementById("friends_lst");
  let idx = -1;
  for (i = 0; i < friends.options.length; i++) {
    if (friends.options[i].label == friend.friend_name)
      idx = i;
  }
  if (idx != -1)
    friends.remove(idx);
}

function handle_opt_in_player_change(player) {
  var players = document.getElementById("players_lst");
  let idx = -1;
  for (i = 0; i < players.options.length; i++) {
    if (players.options[i].label == player.player_name)
      idx = i;
  }
  // in this case the player is in the list - if player.opt_in
  // is false, remove
  if (idx != -1 && !player.opt_in) {
    players.remove(idx);
  }
  else if (player.opt_in) {
    // add to the list
    var opt = document.createElement('option');
    opt.value = player.player_email;
    opt.innerHTML = player.player_name;
    players.appendChild(opt);
  }
}

let un = document.getElementById("user_display_name");
let user_name = un.value;

var ws = new WebSocket(`ws://${ws_addr}:${ws_port}`);

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
  else if (type.type == "data_msg") {
    let action = data.data.shift();
    if (action.type == "opt_in_players_change") {
      let player = data.data[0];
      handle_opt_in_player_change(player);
      console.log(`user_home.onmessage: opt_in_players_change data=${data}`);
    }
    else if (action.type == "remove_friend") {
      let friend = data.data[0];
      handle_remove_friend(friend);
    }
  }
  else if (type.type == "friendlist_add") {
    var fl = document.getElementById("friends_lst");
    var opt = document.createElement("option");
    opt.text = data.data; 
    fl.options.add(opt); 
  }
  else if (type.type == "friendlist_remove") {
    var fl = document.getElementById("friends_lst");
    let idx = -1;
    for (i = 0; i < fl.options.length; i++) {
      if (fl.options[i].label == data.data)
        idx = i;
    }
    if (idx != -1) {
      fl.remove(idx);
    }
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
