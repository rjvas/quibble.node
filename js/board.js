/*
* Heist
* Drawbridge Creative https://drawbridgecreative.com
* copyright 2021
*/

// const ws = new WebSocket('ws://drawbridgecreativegames.com:3043');
const ws = new WebSocket('ws://localhost:3043');

// Detect Firefox
var firefoxAgent = window.navigator.userAgent.indexOf("Firefox") > -1;
var chromeAgent = window.navigator.userAgent.indexOf("Chrome") > -1;


class Tile {
  constructor (svg, drag, json) {
    this.svg = svg;
    this.drag = drag;
    this.json = json;
  }
}

var PlayerHand = [];

var URL = null;
var AppSpace = null;
var Scale = 1.0;
const CELL_SIZE = 35;
const NUM_ROWS_COLS = 15;

const SAFETY_FILL = 'rgba(68,187,85,1)';
const SAFETY_FILL_LITE = 'rgba(68,187,85,.3)';
const CENTER_FILL = 'rgba(255,153,204,1)';

const SAFE_INDEXES = [
  {row: 1, col: 1, rect: null},
  {row: 1, col: NUM_ROWS_COLS, rect: null},
  {row: 2, col: 2, rect: null},
  {row: 2, col: NUM_ROWS_COLS - 1, rect: null },
  {row: 3, col: 3, rect: null},
  {row: 3, col: NUM_ROWS_COLS - 2, rect: null},

  {row: NUM_ROWS_COLS, col: 1, rect: null},
  {row: NUM_ROWS_COLS, col: NUM_ROWS_COLS, rect: null},
  {row: NUM_ROWS_COLS - 1, col: 2, rect: null},
  {row: NUM_ROWS_COLS - 1, col: NUM_ROWS_COLS - 1, rect: null},
  {row: NUM_ROWS_COLS - 2, col: 3, rect: null},
  {row: NUM_ROWS_COLS - 2, col: NUM_ROWS_COLS - 2, rect: null},

  {row: 1, col: Math.round(NUM_ROWS_COLS/2), rect: null},
  {row: Math.round(NUM_ROWS_COLS/2), col: 1, rect: null},
  {row: Math.round(NUM_ROWS_COLS/2), col: NUM_ROWS_COLS, rect: null},
  {row: NUM_ROWS_COLS, col: Math.round(NUM_ROWS_COLS/2), rect: null}
];

const NUM_PLAYER_TILES = 7;

const TEXT_POSITION = 1;
const BLANK_TILE = " ";

const back_ground = "#f5efe6ff";
var scoreboard = null;
var play_drags = [];
var play_trash = [];
var play_starts = [];

const SCOREBOARD_OFFSET = 2*CELL_SIZE;
const SCOREBOARD_HEIGHT = 3*CELL_SIZE;
const SCOREBOARD_WIDTH = NUM_PLAYER_TILES*CELL_SIZE;

var color_picker = {picker: null, player: ""};

function set_default_colors(color) {
/* all of the moves to the server
  var player = color_picker.player;
  var safe = color.rgbaString;
  player.tile_color_safe = safe;
  color._rgba[3] = .2;
  player.tile_color_risky = color.rgbaString;
  var risky = player.tile_color_risky;


  for (let i = 0; i < NUM_PLAYER_TILES; i++) {
    player.tiles[i].is_safe ?
      player.tiles[i].svg.childNodes[Tile.RECT_POSITION].setAttributeNS(null, 'fill', safe)
    :
      player.tiles[i].svg.childNodes[Tile.RECT_POSITION].setAttributeNS(null, 'fill', risky);
  }

  // for now set all played tiles to the appropriate risky or safe color
  for (let i = 0; i < Word.words.length; i++) {
    for (let j= 0; j < Word.words[i].length; j++) {
      if (Word.words[i].tiles[j].player == player) {
        Word.words[i].tiles[j].is_safe ?
          Word.words[i].tiles[j].svg.childNodes[Tile.RECT_POSITION].setAttributeNS(null, 'fill', safe)
        :
          Word.words[i].tiles[j].svg.childNodes[Tile.RECT_POSITION].setAttributeNS(null, 'fill', risky);
      }
    }
  }

  var player_rect = document.getElementById(player.name);
  if (player_rect != null) {
    player_rect.setAttributeNS(null, 'fill', safe);
  }
  else {
    console.log("in set_default_colors set player_rect color failed");
  }
*/
  console.log("in set_default_colors color: ", color );
}

function init_color_popup() {
  var parent = document.getElementById("color_btn");
  color_picker.picker = new Picker(parent, '#0000ff');
  color_picker.picker.setOptions({
    popup: 'right'});
  color_picker.picker.onDone = set_default_colors;
}

function set_button_callbacks() {
  let btn = document.getElementById('save_btn');
  if (btn) {
    btn.addEventListener("click", clicked_save_btn);
  }
  btn = document.getElementById('open_btn');
  if (btn) {
    btn.addEventListener("click", clicked_open_btn);
  }
  btn = document.getElementById('new_btn');
  if (btn) {
    btn.addEventListener("click", clicked_new_btn);
  }
}

function draw_safe_squares() {
  for (let i = 0; i < SAFE_INDEXES.length; i++) {
    let r = document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttributeNS(null, 'x', (SAFE_INDEXES[i].row -1)*CELL_SIZE);
    r.setAttributeNS(null, 'y', (SAFE_INDEXES[i].col - 1)*CELL_SIZE);
    r.setAttributeNS(null, 'width', CELL_SIZE);
    r.setAttributeNS(null, 'height', CELL_SIZE);
    r.setAttributeNS(null, 'fill', back_ground);
    r.setAttributeNS(null, 'stroke-width', 3);
    r.setAttributeNS(null, 'stroke', SAFETY_FILL);
    r.setAttributeNS(null, 'class', 'safety_square');
    SAFE_INDEXES[i].rect = r;
    AppSpace.append(r);

    let t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttributeNS(null, 'x', (SAFE_INDEXES[i].row -1)*CELL_SIZE + CELL_SIZE/2);
    t.setAttributeNS(null, 'y', (SAFE_INDEXES[i].col - 1)*CELL_SIZE + CELL_SIZE/2);
    t.setAttributeNS(null, 'width', CELL_SIZE/4);
    t.setAttributeNS(null, 'height', CELL_SIZE/4);
    t.setAttributeNS(null, 'stroke-width', 1);
    t.setAttributeNS(null, 'fill', SAFETY_FILL_LITE);
    t.setAttributeNS(null, 'text-anchor', "middle");
    t.setAttributeNS(null, 'alignment-baseline',"central");
    t.setAttributeNS(null, 'class', 'safety_text');
    t.textContent = "SAFE";
    AppSpace.append(t);
  }
}

function draw_center_start() {
  var center = {row: Math.round(NUM_ROWS_COLS/2), col: Math.round(NUM_ROWS_COLS/2)};
  // for now just fill, draw the polygon later
  let r = document.createElementNS('http://www.w3.org/2000/svg','rect');
  r.setAttributeNS(null, 'x', (center.row - 1)*CELL_SIZE);
  r.setAttributeNS(null, 'y', (center.col - 1)*CELL_SIZE);
  r.setAttributeNS(null, 'width', CELL_SIZE);
  r.setAttributeNS(null, 'height', CELL_SIZE);
  r.setAttributeNS(null, 'fill', back_ground);
  r.setAttributeNS(null, 'stroke-width', 3);
  r.setAttributeNS(null, 'stroke', CENTER_FILL);
  // r.setAttributeNS(null, 'stroke_width', 0);
  r.setAttributeNS(null, 'class', 'center_square');
  AppSpace.append(r);
}

function draw_board() {
  AppSpace = document.querySelectorAll('#wt_board')[0];

  var board_vert = document.querySelectorAll('.line_vertical');
  for (let i = 0; i <= NUM_ROWS_COLS; i++){
    board_vert[i].setAttributeNS(null, 'x1', i*CELL_SIZE);
    board_vert[i].setAttributeNS(null, 'y1', 0);
    board_vert[i].setAttributeNS(null, 'x2', i*CELL_SIZE);
    board_vert[i].setAttributeNS(null, 'y2', CELL_SIZE*NUM_ROWS_COLS);
    board_vert[i].setAttributeNS(null, 'stroke_width', 1);
  }

  var board_horiz = document.querySelectorAll('.line_horizontal');
  for (let i = 0; i <= NUM_ROWS_COLS; i++){
    board_horiz[i].setAttributeNS(null, 'x1', 0);
    board_horiz[i].setAttributeNS(null, 'y1', i*CELL_SIZE);
    board_horiz[i].setAttributeNS(null, 'x2', CELL_SIZE*NUM_ROWS_COLS);
    board_horiz[i].setAttributeNS(null, 'y2', i*CELL_SIZE);
    board_horiz[i].setAttributeNS(null, 'stroke_width', 1);
  }

}

function tile_clicked(event) {
  var player = null;
  var tile = null;
  var tile_rec = null;
  var word = null;
  var svg = null;
  var clicked_row = -1;
  var clicked_column = -1;

  let txt = event.currentTarget;
  txt != null ? svg = txt.nearestViewportElement : svg = null;
  if (svg != null) {
    // if (firefoxAgent) {
    //   clicked_row = Math.round(parseInt(svg.getAttributeNS(null, 'y'))/CELL_SIZE) + 1;
    //   clicked_column = Math.round(parseInt(svg.getAttributeNS(null, 'x'))/CELL_SIZE) + 1;
    // } else {
      clicked_row = Math.round(parseInt(svg.getAttributeNS(null, 'y'))/CELL_SIZE);
      clicked_column = Math.round(parseInt(svg.getAttributeNS(null, 'x'))/CELL_SIZE);
    // }
  }

  // Clicked on a board tile - cycle through player colors
  // But first = make sure we're in between plays (new_word length == 0)
  // and there are actually words on the board to work with.
/*
  if (Word.new_word.tiles.length == 0 &&
      Word.words.length != 0 &&
      clicked_column <= NUM_ROWS_COLS &&
      clicked_row <= NUM_ROWS_COLS) {
    for (let i = 0; i < Word.words.length; i++) {
      for (let j = 0; j < Word.words[i].tiles.length; j++) {
        // these tiles must be in words, not player hands
        if (Word.words[i].tiles[j].row == clicked_row &&
            Word.words[i].tiles[j].column == clicked_column) {
          word = Word.words[i];
          tile = Word.words[i].tiles[j];
          player = tile.player;
          break;
        }
      }
    }

    if (cycle_colors && word && tile) {
      cycle_tile_colors(word, tile);
    } else if (word && word.check_words.length > 0) {
        window.alert(word.check_words.join(" "));
    }
  }
  */
  console.log('tile_clicked - row: %d column: %d', clicked_row, clicked_column);
}

function clicked_player_area(event) {
  var player = null;
  if (event.currentTarget.id == "player_1_area") {
    color_picker.player = "player_1";
  }
  else if (event.currentTarget.id == "player_2_area") {
    color_picker.player = "player_2";
  }
  var clr = event.currentTarget.getAttributeNS(null, "fill");
  color_picker.picker.setOptions({
    popup: 'right',
    color: clr});
  color_picker.picker.show();
}

function setup_tile_for_play(tile, no_drag) {

  let board_width = NUM_ROWS_COLS*CELL_SIZE;
  let startx = board_width + CELL_SIZE;

  let svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  if (svg) {
    if (!no_drag) svg.setAttributeNS(null, 'class', 'player_tile_svg');
    svg.setAttributeNS(null, 'id', "tile_" + tile.id);
    svg.setAttributeNS(null, 'x', startx + tile.player_hand_idx*CELL_SIZE);
    svg.setAttributeNS(null, 'y', 0);
    svg.setAttributeNS(null, 'width', CELL_SIZE);
    svg.setAttributeNS(null, 'height', CELL_SIZE);

    // rect and text position attributes are always relative to the svg
    let r = document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttributeNS(null, 'x', 0);
    r.setAttributeNS(null, 'y', 0);
    r.setAttributeNS(null, 'width', CELL_SIZE);
    r.setAttributeNS(null, 'height', CELL_SIZE);
    r.setAttributeNS(null, 'fill', tile.fill);
    r.setAttributeNS(null, 'stroke_width', 1);
    r.setAttributeNS(null, 'stroke', '#000');
    r.setAttributeNS(null, 'class', 'tile_rect');

    let t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttributeNS(null, 'x', CELL_SIZE/2);
    t.setAttributeNS(null, 'y', CELL_SIZE/2);
    t.setAttributeNS(null, 'width', CELL_SIZE);
    t.setAttributeNS(null, 'height', CELL_SIZE);
    t.setAttributeNS(null, 'stroke_width', 2);
    t.setAttributeNS(null, 'stroke', '#000');
    t.setAttributeNS(null, 'text-anchor', "middle");
    t.setAttributeNS(null, 'alignment-baseline',"central");
    t.setAttributeNS(null, 'class', 'tile_text');
    t.textContent = tile.char;
    t.addEventListener("click", tile_clicked);

    let p = document.createElementNS('http://www.w3.org/2000/svg','text');
    p.setAttributeNS(null, 'x', CELL_SIZE - 2);
    p.setAttributeNS(null, 'y', CELL_SIZE - 10);
    // p.setAttributeNS(null, 'style', { font: "italic 8px sans-serif" });
    p.setAttributeNS(null, 'width', CELL_SIZE/10);
    p.setAttributeNS(null, 'height', CELL_SIZE/10);
    p.setAttributeNS(null, 'stroke_width', 1);
    p.setAttributeNS(null, 'stroke', '#000');
    p.setAttributeNS(null, 'text-anchor', "end");
    p.setAttributeNS(null, 'alignment-baseline',"central");
    p.setAttributeNS(null, 'class', 'tile_points');
    p.textContent = tile.points;

    svg.append(r);
    svg.append(t);
    svg.append(p);

    AppSpace.append(svg);

    if (!no_drag) {
      let drag_rec = new PlainDraggable(svg);

      drag_rec.onMove = tile_moving;
      drag_rec.onDragEnd = tile_moved;
      drag_rec.onDragStart = tile_move_start;

      drag_rec.containment = {left: 0, top: 0,
        width: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'width'),
        height: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'height')};
      drag_rec.snap = {x: {start: 0, step:"4.17%"}, y:{start:0, step:"6.25%"}};

      PlayerHand[tile.player_hand_idx] = new Tile(svg, drag_rec, get_tile_json(svg, tile.player_hand_idx));
    }
  }

  console.log("in setup_tile_for_play: ", PlayerHand[tile.player_hand_idx]);
  return svg;
}

function set_tile_props(tile) {
  let svg = document.getElementById("tile_" + tile.id);
  if (svg) {
    let r = svg.childNodes[0];
    r.setAttributeNS(null, 'fill', tile.fill);
    svg.classList.remove('player_tile_svg');
  }
  else {
    svg = setup_tile_for_play(tile, true);
    svg.setAttributeNS(null, 'x', (tile.col - 1)*CELL_SIZE);
    svg.setAttributeNS(null, 'y', (tile.row - 1)*CELL_SIZE);
  }
}

function get_played_JSONS() {
  let jsons = [];
  let tile_svgs = document.querySelectorAll('.player_tile_svg');
  tile_svgs.forEach( item => {
    let x = item.getAttributeNS(null, "x");
    let y = item.getAttributeNS(null, "y");
    let col = Math.round(x/CELL_SIZE) + 1;
    let row = Math.round(y/CELL_SIZE) + 1;
    // if these are the played tiles ...
    if (x >= 0 && y >= 0 &&
        x < NUM_ROWS_COLS*CELL_SIZE && y < NUM_ROWS_COLS*CELL_SIZE) {
      jsons.push({
        id : item.id,
        char : item.childNodes[1].textContent,
        x : x,
        y : y,
        row : row,
        col : col
      });
    }
  });
  return jsons;
}

function handle_err_response(resp) {
  let err_msg = resp[0].err_msg;
  alert(err_msg);

  let board_width = NUM_ROWS_COLS*35;
  for (let i = 1; i < resp.length; i++) {
    let svg = document.getElementById("tile_" + resp[i].id);
    if (svg) {
       let dx = resp[i].player_hand_idx*CELL_SIZE + CELL_SIZE;
       svg.setAttributeNS(null, 'x', board_width + dx);
       svg.setAttributeNS(null, 'y', 0);
       let rec = play_drags.find(item => {
         return item.svg == svg;
       })
       if (rec) rec.drag.position();
    }
  }
}

function update_scoreboard(data) {
  let ret_val = true;
  if (data.scoreboard_player_1_name) {
    item = document.getElementById("scoreboard_player_1");
    if (item) item.textContent = data.scoreboard_player_1_name;
  }
  else if (data.scoreboard_player_1_score) {
    item = document.getElementById("scoreboard_player_1_score");
    if (item) item.textContent = data.scoreboard_player_1_score;
  }
  else if (data.scoreboard_player_2_name) {
    item = document.getElementById("scoreboard_player_2");
    if (item) item.textContent = data.scoreboard_player_2_name;
  }
  else if (data.scoreboard_player_2_score) {
    item = document.getElementById("scoreboard_player_2_score");
    if (item) item.textContent = data.scoreboard_player_2_score;
  }
  else if (data.tiles_left_value >= 0) {
    item = document.getElementById("scoreboard_tiles_left_value");
    if (item) item.textContent = data.tiles_left_value;
  } else
    ret_val = false;

  return ret_val;
}

function handle_the_response(resp) {
  // error responses
  if (resp[0].err_msg) {
    handle_err_response(resp);

  } else { // handle the data response
    let new_data = resp[0].new_data;
    let word_tiles = resp[0].word_tiles;

    // first, dump the drags and set the correct fill
    // and get rid of the '.player_tile_svg' class
    for (let i = 0; i < word_tiles.length; i++) {
      let rec = play_drags.find(item => {
        return item.svg_id == "tile_" + word_tiles[i].id;
      })
      if (rec) {
        rec.drag.remove();
        rec.svg.classList.remove('player_tile_svg');
        rec.svg.childNodes[0].setAttributeNS(null, "fill", word_tiles[i].fill);
      }
    }

    // now update the play data
    let item = null;
    for (let i = 0; i < new_data.length; i++) {
      if (update_scoreboard(new_data[i])) {;}
      else if (new_data[i].play_data) {
        new_data[i].play_data.forEach((item, idx) => {
          set_tile_props(item);
        });
      }
      // new tiles
      else if (new_data[i].new_tiles) {
        new_data[i].new_tiles.forEach((item, idx) => {
          setup_tile_for_play(item, false);
        });
      }
    }
  }

  play_drags = [];
}

// jsonify the just-played-tiles and send them back to the server
function clicked_player_name(event) {

  // if the active player clicked the other player's name
  if (event.currentTarget.textContent == 'Wait ...') return;

  if (!URL) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL = "/player1" : URL = "/player2";
  }

  if (URL == "/player1") {
    let txt = document.getElementById("scoreboard_player_1");
    if (txt.textContent == "Wait ...") return;
  }
  else if (URL == "/player2") {
    let txt = document.getElementById("scoreboard_player_2");
    if (txt.textContent == "Wait ...") return;
  }

  let jsons = get_played_JSONS();
  jsons.unshift({"type" : "regular_play"});

  console.log("in clicked_player_name: " + JSON.stringify(jsons));
  ws.send(JSON.stringify(jsons));

  console.log("clicked on ", event.currentTarget.innerHTML);
}

function get_player_hand_JSONS() {
  let jsons = [];
  PlayerHand.forEach((item, i) => {
    jsons.push(item.json);
  });

  // let tile_svgs = document.querySelectorAll('.player_tile_svg');
  // for (let i= 0; i < tile_svgs.length; i++) {
  //   let item = tile_svgs[i];
  //   // don't get the magic S
  //   if (i != 7) {
  //     let x = item.getAttributeNS(null, "x");
  //     let y = item.getAttributeNS(null, "y");
  //     let col = Math.round(x/CELL_SIZE) + 1;
  //     let row = Math.round(y/CELL_SIZE) + 1;
  //     jsons.push({
  //       id : item.id,
  //       char : item.childNodes[1].textContent,
  //       x : x,
  //       y : y,
  //       row : row,
  //       col : col,
  //       player_hand_idx : i
  //     });
  //   }
  // };
  return jsons;
}

function erase_player_hand() {
  let tile_svgs = document.querySelectorAll('.player_tile_svg');
  let back_fill = AppSpace.getAttributeNS(null, "fill");
  for (let i= 0; i < tile_svgs.length; i++) {
    let item = tile_svgs[i];
    // don't get the magic S
    if (i != 7) {
      item.childNodes[0].setAttributeNS(null, "fill", "white");
      item.childNodes[1].setAttributeNS(null, "stroke", "white");
      item.childNodes[2].setAttributeNS(null, "stroke", "white");
    }
  }
}

function get_played_trash_JSONS() {
  var jsons = [];
  play_trash.forEach( item => {
    let x = item.svg.getAttributeNS(null, "x");
    let y = item.svg.getAttributeNS(null, "y");
    let col = Math.round(x/CELL_SIZE) + 1;
    let row = Math.round(y/CELL_SIZE) + 1;
    jsons.push({
      id : item.svg.id,
      char : item.svg.childNodes[1].textContent,
      x : x,
      y : y,
      row : row,
      col : col
    });
  });
return jsons;
}

function repatriate_trashed_tiles() {

  if (play_starts.length > 0) {
    play_starts.forEach(item => {
      // play_starts.push({"svg_id" : svg.id, "svg" : svg, "start" : new_position});
      let svg = document.getElementById(item.svg_id);
      svg.setAttributeNS(null, "x", item.x);
      svg.setAttributeNS(null, "y", item.y);
      let rec = play_drags.find(drg => {
        return drg.svg == svg;
      })
      if (rec) rec.drag.position();
    });
  }
  play_starts = [];
  play_drags = [];
  play_trash = [];

}

function clicked_tiles_area(event) {

  if (!URL) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL = "/player1" : URL = "/player2";
  }

  if (URL == "/player1") {
    let txt = document.getElementById("scoreboard_player_1");
    if (txt.textContent == "Wait ...") return;
  }
  else if (URL == "/player2") {
    let txt = document.getElementById("scoreboard_player_2");
    if (txt.textContent == "Wait ...") return;
  }

  let jsons = null;

  // if not enough tiles to complete, consider this a pass
  let tiles_left = parseInt(document.getElementById("scoreboard_tiles_left_value").textContent);
  if (play_trash.length == 0 && tiles_left < NUM_PLAYER_TILES ||
      play_trash.length > tiles_left) {
    window.alert("Not enough tiles left to complete the play - THIS IS A PASS")
    repatriate_trashed_tiles();
    jsons =[{"type" : "pass"}];
  }

  else {
    if (play_trash.length == 0 &&
        window.confirm("Are you sure you want to trade all of your tiles?")) {
      jsons = get_player_hand_JSONS();
      erase_player_hand();

    } else if (play_trash.length > 0) {
        // roll back if no confirm
        if (window.confirm("Are you sure you want to trade " + play_trash.length + " of your tiles?")) {
          jsons = get_played_trash_JSONS();
        }
        // move the trashed tiles back to the player tile area
        else {
          repatriate_trashed_tiles();
        }
      }
    else return;
  }

  if (jsons.length > 0) {
    if (!jsons[0].type)
      jsons.unshift({"type" : "xchange"});
    ws.send(JSON.stringify(jsons));
  }

  console.log("clicked on " + event.currentTarget.innerHTML);
}

function clicked_save_btn(event) {
  let foo = null;
  let p = prompt("Game name?");
  // if (!WtDB) {
  //   delete_WtDB();
  //   open_db();
  // }
}

function clicked_new_btn(event) {
  if (!URL) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL = "/player1" : URL = "/player2";
  }

  if (window.confirm("New game?")) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", URL + "/new_game", true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = URL;;
        }
    }

    xhr.send(null);
  }
}

function clicked_open_btn(event) {
  let foo = null;
}

function tile_move_start(new_position) {
  let svg = this.element;
  let x = svg.getAttributeNS(null, "x");
  let y = svg.getAttributeNS(null, "y");

  let phi = -1;
  let tile = PlayerHand.find((t, idx) => {
    if (t.svg == svg) {
      phi = idx;
      return t;
    }
  });

  play_starts.push({"svg_id" : svg.id, "svg" : svg, "x" : x, "y" : y});
  console.log("tile_move_start: ", get_tile_json(svg, phi));
}

function rearrange_hand(svg, to_idx) {

  let tile = PlayerHand.find(t => {
    return t.svg == svg;
  });

  // move the svgs and update the json.char and json.id
  if (tile) {
    let char = tile.json.char;
    let id = tile.json.id;
    let drag = tile.drag;

    if (to_idx > tile.json.player_hand_idx) {
      for (let i = tile.json.player_hand_idx; i < to_idx; i++) {
        PlayerHand[i].svg = PlayerHand[i+1].svg;
        PlayerHand[i].drag = PlayerHand[i+1].drag;
        PlayerHand[i].json.id = PlayerHand[i+1].json.id;
        PlayerHand[i].json.char = PlayerHand[i+1].json.char;
        PlayerHand[i].svg.setAttributeNS(null, "x", PlayerHand[i].json.x);
        PlayerHand[i].svg.setAttributeNS(null, "y", PlayerHand[i].json.y);
        PlayerHand[i].drag.position();
      }
    }
    else if (to_idx < tile.json.player_hand_idx) {
      for (let i = tile.json.player_hand_idx; i > to_idx; i--) {
        PlayerHand[i].svg = PlayerHand[i-1].svg;
        PlayerHand[i].drag = PlayerHand[i-1].drag;
        PlayerHand[i].json.id = PlayerHand[i-1].json.id;
        PlayerHand[i].json.char = PlayerHand[i-1].json.char;
        PlayerHand[i].svg.setAttributeNS(null, "x", PlayerHand[i].json.x);
        PlayerHand[i].svg.setAttributeNS(null, "y", PlayerHand[i].json.y);
        PlayerHand[i].drag.position();
      }
    }
    PlayerHand[to_idx].svg = svg;
    PlayerHand[to_idx].drag = drag;
    PlayerHand[to_idx].json.char = char;
    PlayerHand[to_idx].json.id = id;
    PlayerHand[to_idx].svg.setAttributeNS(null, "x", PlayerHand[to_idx].json.x);
    PlayerHand[to_idx].svg.setAttributeNS(null, "y", PlayerHand[to_idx].json.y);
    PlayerHand[to_idx].drag.position();
  }
}

function tile_moving(new_position) {
  // 'this' references the PlainDraggable instance
  Scale = CELL_SIZE / this.rect.width;

  // note that there are +1 and -1 conversions on row/col - this is due to
  // using 0-based coordinate system for x/y and 1-based coord system
  // for row/col

  // just initing ...
  let row = -1;
  let col = -1;

  // if (firefoxAgent) {
  //   row = Math.round(scale*new_position.top/CELL_SIZE) - 1;
  //   col = Math.round(scale*new_position.left/CELL_SIZE) - 1;
  // } else {
    row = Math.round(Scale*new_position.top/CELL_SIZE + 1);
    col = Math.round(Scale*new_position.left/CELL_SIZE + 1);
  // }
  let svg = this.element;

  // if dragging within the player-hand area ...
  if (row == 1 && col > 16 && col < 24) {
    let cur_location_idx = col - 17;
    rearrange_hand(svg, cur_location_idx);
    console.log("tile_moving - player hand idx: " + (col - 17));
  }

  // Upto this point all tiles have a PlainDraggable wrapper that uses
  // css' translate. So, the tiles.svg have the original player_hand
  // coordinates and a translate field. In tile_clicked this causes issues
  // with cycling through the player colors because setting the rect color
  // directly doesn't use the css translate. So, fix up the svg coords here.d
  svg.setAttributeNS(null, 'transform', "");
  svg.setAttributeNS(null, 'x', (col - 1)*CELL_SIZE);
  svg.setAttributeNS(null, 'y', (row - 1)*CELL_SIZE);

  // tile.is_safe ? tile.set_tile_color(CurrentPlayer.tile_color_safe) :
  //   tile.set_tile_color(CurrentPlayer.tile_color_risky);
  console.log('tile_moving - row: %d column: %d this.rect.width: %f Scale: %f',
    row, col, this.rect.width, Scale);
}

function tile_moved(new_position) {
  // 'this' references the PlainDraggable instance
  Scale = CELL_SIZE / this.rect.width;
  var row = -1;
  var col = -1;
  var letter;

  let svg = this.element;
  play_drags.push({"svg_id" : svg.id, "svg" : svg, "drag" : this});

  col = Math.round(Scale*new_position.left/CELL_SIZE) + 1;
  row = Math.round(Scale*new_position.top/CELL_SIZE) + 1;

  console.log('finished drag at - row: %d column: %d', row, col);

  // TODO ugly
  if (row >= 3 && row <= 5 &&
    col >= 18 && col <= 20) {
    console.log("tile to trash ...");
    play_trash.push({"svg_id" : svg.id, "svg" : svg, "drag" : this});
  }
  // the tile may have been moved off the board
  else if (row <= NUM_ROWS_COLS && row > 0 &&
          col <= NUM_ROWS_COLS && col > 0) {
    let char = svg.childNodes[TEXT_POSITION].textContent;
    if (char == BLANK_TILE) {
      letter = window.prompt("Please type the letter to use: ");
      if (letter) {
        svg.childNodes[TEXT_POSITION].textContent = letter.trim().toLowerCase();
      }
      console.log("blank tile moved: " + letter);
    }
  }
}

function get_tile_json(svg, idx) {
  let x = svg.getAttributeNS(null, "x");
  let y = svg.getAttributeNS(null, "y");
  let col = Math.round(x/CELL_SIZE) + 1;
  let row = Math.round(y/CELL_SIZE) + 1;
  return {
    id : svg.id,
    char : svg.childNodes[1].textContent,
    x : x,
    y : y,
    row : row,
    col : col,
    player_hand_idx : idx
  };
}

function setup_tiles_for_drag() {
  let tile_svgs = document.querySelectorAll('.player_tile_svg');
  tile_svgs.forEach( (item, idx) => {
    let drag_rec = new PlainDraggable(item);

    drag_rec.onMove = tile_moving;
    drag_rec.onDragEnd = tile_moved;
    drag_rec.onDragStart = tile_move_start;

    drag_rec.containment = {left: 0, top: 0,
      width: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'width'),
      height: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'height')};
    drag_rec.snap = {x: {start: 0, step:"4.17%"}, y:{start:0, step:"6.25%"}};

    PlayerHand.push(new Tile(item, drag_rec, get_tile_json(item, idx)));
  });
}

function update_the_board(resp) {
  // error responses
  if (resp[0].err_msg) {
    return;

  } else { // handle the data response
    let new_data = resp[0].new_data;
    let word_tiles = resp[0].word_tiles;

    // now update the play data
    let item = null;
    for (let i = 0; i < new_data.length; i++) {
      if (update_scoreboard(new_data[i])) {;}
      else if (new_data[i].play_data) {
        new_data[i].play_data.forEach((item, idx) => {
          set_tile_props(item);
        });
      }
    }
  }

  console.log("in update_the_board")
}

function handle_exchange(resp) {
  console.log("in handle_exchange: " + JSON.stringify(resp));

  let new_data = resp[0].new_data;
  let xchanged_tiles = resp[0].xchanged_tiles;

  // update the scoreboard
  for (let i = 0; i < new_data.length; i++) {
    if (update_scoreboard(new_data[i])) {;}
  }

  // new tiles
  xchanged_tiles.forEach((item, idx) => {
    setup_tile_for_play(item, false);
  });

  play_starts = [];
  play_drags = [];
  play_trash = [];
}

function handle_pass(resp) {
  // update the scoreboard
  for (let i = 0; i < resp[0].new_data.length; i++) {
    if (update_scoreboard(resp[0].new_data[i])) {;}
  }
}

function handle_game_over(resp) {
  // build the game over message
  var p1_msg = "Final Score: Player 1: "
  var p2_msg = "Final Score: Player 2: "

  var p1_tiles_inhand = [];
  resp[0].player1.remaining_tiles.forEach((item, i) => {
    p1_tiles_inhand.push(item.char +  "/" + item.points);
  });
  p1_msg += resp[0].player1.score + '\n' + "Unplayed tiles: \n" +
    p1_tiles_inhand.join(" ");

  var p2_tiles_inhand = [];
  resp[0].player2.remaining_tiles.forEach((item, i) => {
    p2_tiles_inhand.push(item.char + "/" + item.points);
  });
  p2_msg += resp[0].player2.score + '\n' + "Unplayed tiles: \n"  + p2_tiles_inhand.join(" ");

  window.alert("GAME OVER!\n\n" + p1_msg + "\n\n" + p2_msg);
}

AppSpace = document.querySelectorAll('#wt_board')[0];

ws.onmessage = function(msg) {

  if (!URL) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL = "/player1" : URL = "/player2";
  }

  let resp = JSON.parse(msg.data);

  // need this for vectoring control
  let type = resp.shift();

  // this data should be going to both players. The inactive player
  // needs to handle the data differently - ignore the new player-hand tiles
  // and just show the played tiles and scoreboard
  let player = resp.shift();

  console.log("in onmessage: player = " + player.player + " URL = " + URL);
  console.log("in onmessage: msg = " + msg.data);

  if (type.type == "game_over") {
    handle_game_over(resp);
  }

  else if (type.type == "pass") {
    handle_pass(resp);
  }

  else if (type.type == "xchange") {
    if (player.player == URL) {
      handle_exchange(resp);
    }
    else {
      // update the scoreboard
      let new_data = resp[0].new_data;
      for (let i = 0; i < new_data.length; i++) {
        if (update_scoreboard(new_data[i])) {;}
      }
    }
  }

  else if (type.type == "regular_play") {
    if (player.player == URL)
      handle_the_response(resp);
    else
      update_the_board(resp);
  }

  else {
    console.log("in onmessage: no play type");
  }
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

set_button_callbacks();
draw_board();
setup_tiles_for_drag();
