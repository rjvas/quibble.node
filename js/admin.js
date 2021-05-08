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

  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/wh_admin_user?" + new_user, true);
  xhr.setRequestHeader("Content-Type", "text/json");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = "/wh_admin?user=" + user;
        console.log("admin.changed_user.callback: user: " + new_user);
      }
  }

  console.log("admin.changed_user: user: " + new_user);
  xhr.send(null);
}

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
