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
          if (this.responseURL.indexOf("player1") != -1)
            document.location.href = "/player1";
          else
            document.location.href = "/player2";
          // document.location.href = "/player1";
        }
    }

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
        if (xhr.readyState === 4 && xhr.status === 200) {
          if (this.responseURL.indexOf("player1") != -1)
            document.location.href = "/player1";
          else
            document.location.href = "/player2";
          // console.log("clicked_saved_games_btn.callback port: " + ws_port);
        }
    }

    // console.log("clicked_saved_games_btn port: " + ws_port);
    xhr.send(null);
  }
}

function init() {

  let btn = document.getElementById('practice_btn');
  if (btn) {
    btn.addEventListener("click", new_practice_game);
  }

  btn = document.getElementById('saved_games_btn');
  if (btn) {
    btn.addEventListener("click", clicked_saved_games_btn);
  }

}

let un = document.getElementById("user_display_name");
let user_name = un.value;

init();
