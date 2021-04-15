/*
* Heist
* Drawbridge Creative https://drawbridgecreative.com
* copyright 2021
*/

function new_practice_game() {

  if (window.confirm("New practice game?")) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/player1/new_practice_game", true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = "/player1";
        }
    }

    xhr.send(null);
  }

}

function init() {
  let btn = document.getElementById('practice_btn');
  if (btn) {
    btn.addEventListener("click", new_practice_game);
  }


}

let un = document.getElementById("user_display_name");
let user_name = un.value;

init();
