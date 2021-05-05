/*
* Heist
* Drawbridge Creative https://drawbridgecreative.com
* copyright 2021
*/

function new_practice_game() {

  if (window.confirm("New practice game?")) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/new_practice_game", true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = "/player1?" + this.responseText;
        }
    }

    xhr.send(null);
  }
}

function clicked_delete_game_btn(event) {

  var deleted = document.getElementById("saved_games_lst").value;

  if (deleted > -1) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/delete_game?" + deleted, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.location.href = "/home_page";
        }
    }

    // console.log("clicked_saved_games_btn port: " + ws_port);
    xhr.send(null);
  }
}

function clicked_active_games_btn(event) {

  var active = document.getElementById("active_games_lst").value;
  if (active > -1) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/play_active_game?" + active, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      document.location.href = this.responseURL;
    }

    // console.log("clicked_saved_games_btn port: " + ws_port);
    xhr.send(null);
  }
}

function clicked_saved_games_btn(event) {

  var saved = document.getElementById("saved_games_lst").value;
  if (saved > -1) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/load_game?" + saved, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
      document.location.href = this.responseURL;
    }

    // console.log("clicked_saved_games_btn port: " + ws_port);
    xhr.send(null);
  }
}

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

function clicked_pickup_btn(event) {

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/pickup_game", true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/home_page";
        // console.log("clicked_logout_btn.callback port: " + ws_port);
      }
  }
  // console.log("clicked_logout_btn port: " + ws_port);
  xhr.send(null);
}

function clicked_play_pickup_btn(event) {

  var p_name = document.getElementById("pickup_lst").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/play_pickup_game?" + p_name, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/player1";
        // console.log("clicked_logout_btn.callback port: " + ws_port);
      }
  }
  // console.log("clicked_logout_btn port: " + ws_port);
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

  btn = document.getElementById('saved_games_btn');
  if (btn) {
    btn.addEventListener("click", clicked_saved_games_btn);
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
    btn.addEventListener("click", clicked_pickup_btn);
  }

  btn = document.getElementById('play_pickup_btn');
  if (btn) {
    btn.addEventListener("click", clicked_play_pickup_btn);
  }

}

let un = document.getElementById("user_display_name");
let user_name = un.value;


init();
