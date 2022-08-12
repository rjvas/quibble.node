/*
* Heist
* Drawbridge Creative https://drawbridgecreative.com
* copyright 2021
*/

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

  if (!window.confirm("Are you sure you want to delete this game? It cannot be undone!"))
    return;

  var deleted = document.getElementById("saved_games_lst").value;
  var user = document.getElementById("user").value;

  if (deleted > -1) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/delete_game?game_idx=" + deleted + "&user=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.location.href = "/home_page?user=" + user;
        }
    }

    // console.log("clicked_games_btn port: " + ws_port);
    xhr.send(null);
  }
}

function clicked_active_games_btn(event) {
  var user = document.getElementById("user").value;
  var active = document.getElementById("active_games_lst").value;

  if (active > -1) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/play_active_game?game_idx=" + active + "&user=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      document.location.href = this.responseURL;
    }
    xhr.send(null);
  }
}

function clicked_games_btn(event) {
  var user = document.getElementById("user").value;
  var saved = document.getElementById("saved_games_lst").value;

  if (saved > -1) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/load_game?game_idx=" + saved + "&user=" + user, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      document.location.href = this.responseURL;
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
  var p_idx = document.getElementById("pickup_lst").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/play_pickup_game?vs=" + p_idx + "&user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/player1";
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

init();
