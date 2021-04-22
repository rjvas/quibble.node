/*
* Heist
* Drawbridge Creative https://drawbridgecreative.com
* copyright 2021
*/

// Detect Firefox
var firefoxAgent = window.navigator.userAgent.indexOf("Firefox") > -1;
var chromeAgent = window.navigator.userAgent.indexOf("Chrome") > -1;

var URL_x = null;
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
const char_regex = /^[a-z]{1}$|^[A-Z]{1}$/;

const back_ground = "#f5efe6ff";
var scoreboard = null;

class Tile {
  constructor (svg, drag, idx, status) {

    this.id = svg.getAttributeNS(null, "id");
    this.char = svg.childNodes[1].textContent;
    this.x = svg.getAttributeNS(null, "x");
    this.y = svg.getAttributeNS(null, "y");
    this.row = Math.round(this.y/CELL_SIZE) + 1;
    this.column = Math.round(this.x/CELL_SIZE) + 1;
    this.player_hand_idx = idx;

    this.svg = svg;
    this.drag = drag;

    this.status = status;
    if (this.char == BLANK_TILE) this.status |= Tile.is_blank;
  }

  get_JSON() {
    return {
      id : this.id,
      char : this.char,
      x : this.x,
      y : this.y,
      row : this.row,
      col : this.col,
      player_hand_idx : this.player_hand_idx
    };
  }

  move(row, col) {

    this.row = row;
    this.column = col;
    this.x = (col - 1)*CELL_SIZE;
    this.y = (row - 1)*CELL_SIZE;
    this.svg.setAttributeNS(null, "x", this.x);
    this.svg.setAttributeNS(null, "y", this.y);

    this.drag.position();

    // TODO: refact to Board.in_board, PlayerHand.in_hand, etc
    if (this.row > 0 && this.row < 16 &&
        this.column > 0 && this.column < 16) {
      this.status |= Tile.on_board;
      if (this.status & Tile.in_hand) this.status ^= Tile.in_hand;
    }
    else if (PlayerHand.in_hand(row, col)) {
      if (this.status & Tile.on_board) this.status ^= Tile.on_board;
      if (!PlayerHand.add(this)) {
        // probably already in hand - so, do nothing
      }
    }
    else if (this.row >= 3 && this.row <= 5 &&
      this.column >= 18 && this.column <= 20) {
        this.status |= Tile.trashed;
        if (this.status & Tile.in_hand) this.status ^= Tile.in_hand;
    }
  }

  // these are the legitimate tile states
  static none = -1;
  static in_hand = 1;
  static on_board = 2;
  static trashed = 4;
  static is_blank = 8;
  static is_magic_s = 16;
}

class PlayerHand {
  constructor() {
  }
  static tiles = [];
  static squares = [
    { "row" : 1, "column" : 17 },
    { "row" : 1, "column" : 18 },
    { "row" : 1, "column" : 19 },
    { "row" : 1, "column" : 20 },
    { "row" : 1, "column" : 21 },
    { "row" : 1, "column" : 22 },
    { "row" : 1, "column" : 23 },
    { "row" : 1, "column" : 24 }
  ];

  static rearrange_hand(svg, to_idx) {

    let tile = PlayerHand.tiles.find(t => {
      return t && t.svg == svg;
    });

    // move the svgs and update the json.char and json.id
    if (tile && tile.status & Tile.in_hand && tile.player_hand_idx != to_idx) {
      // simple case - just stuff it in
      if (PlayerHand.tiles[to_idx] == null) {
        PlayerHand.tiles[to_idx] = tile;
      }

      else if (to_idx > tile.player_hand_idx) {
        for (let i = tile.player_hand_idx; i < to_idx; i++) {
          if (PlayerHand.tiles[i] && PlayerHand.tiles[i].status & Tile.in_hand) {
            PlayerHand.tiles[i] = PlayerHand.tiles[i+1];
            PlayerHand.tiles[i].x = (i+16)*CELL_SIZE;
            PlayerHand.tiles[i].column -= 1;
            PlayerHand.tiles[i].player_hand_idx = i;
            PlayerHand.tiles[i].svg.setAttributeNS(null, "x", PlayerHand.tiles[i].x);
            PlayerHand.tiles[i].svg.setAttributeNS(null, "y", PlayerHand.tiles[i].y);
            PlayerHand.tiles[i].svg.setAttributeNS(null, "transfom", "");
            PlayerHand.tiles[i].drag.position();
          }
        }
      }

      else if (to_idx < tile.player_hand_idx) {
        for (let i = tile.player_hand_idx; i > to_idx; i--) {
          if (PlayerHand.tiles[i] && PlayerHand.tiles[i].status & Tile.in_hand) {
            PlayerHand.tiles[i] = PlayerHand.tiles[i-1];
            PlayerHand.tiles[i].x = (i+16)*CELL_SIZE;
            PlayerHand.tiles[i].column += 1;
            PlayerHand.tiles[i].player_hand_idx = i;
            PlayerHand.tiles[i].svg.setAttributeNS(null, "x", PlayerHand.tiles[i].x);
            PlayerHand.tiles[i].svg.setAttributeNS(null, "y", PlayerHand.tiles[i].y);
            PlayerHand.tiles[i].svg.setAttributeNS(null, "transfom", "");
            PlayerHand.tiles[i].drag.position();
          }
        }
      }

      PlayerHand.tiles[to_idx] = tile;
      PlayerHand.tiles[to_idx].x = (to_idx + 16) * CELL_SIZE; // 0-based
      PlayerHand.tiles[to_idx].column = to_idx + 17; // 1-based
      PlayerHand.tiles[to_idx].y = 0;
      PlayerHand.tiles[to_idx].player_hand_idx = to_idx;
      PlayerHand.tiles[to_idx].svg.setAttributeNS(null, "x", PlayerHand.tiles[to_idx].x);
      PlayerHand.tiles[to_idx].svg.setAttributeNS(null, "y", PlayerHand.tiles[to_idx].y);
      PlayerHand.tiles[to_idx].svg.setAttributeNS(null, "transfom", "");
      PlayerHand.tiles[to_idx].drag.position();
    }
  }

  static in_hand(r, c) {
    if (r == 1 && c < 25 && c > 16) return true;
    return false;
  }
  static get_open_slot() {
    for (let i = 0; i< PlayerHand.tiles.length; i++) {
      if (!PlayerHand.tiles[i]) return i;
    }
    return -1;
  }
  static remove(tile) {
    if (tile.status & Tile.in_hand) tile.status = tile.status ^ Tile.in_hand;
    // a little brute force here - if the tile has been moved through the
    // playerhand on the way to the board then it may reside in more than one
    // playerhand slot - so, null *all* of the slots that reference it.
    PlayerHand.tiles.forEach((item, i) => {
      if (item == tile)
        PlayerHand.tiles[i] = null;
    });
  }
  static add(tile) {
    let idx = -1;
    let exists = PlayerHand.tiles.find(t => {
      return t && t.id == tile.id;
    });
    if (!exists) {
      if ((idx = PlayerHand.get_open_slot()) != -1) {
        PlayerHand.tiles[idx] = tile;
        tile.status = Tile.in_hand;
        tile.hand_idx = idx;
        tile.x = (16 + idx)*CELL_SIZE;
        tile.y = 0;
        tile.svg.setAttributeNS(null, "x", tile.x);
        tile.svg.setAttributeNS(null, "y", tile.y);
        tile.drag.position();
        return true;
      }
    }
    return false;
  }

};

var PlayTrash = [];
var PlayStarts = [];

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

  btn = document.getElementById('save_close_btn');
  if (btn) {
    btn.addEventListener("click", clicked_save_close_btn);
  }

  btn = document.getElementById('home_btn');
  if (btn) {
    btn.addEventListener("click", clicked_home_btn);
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
  // console.log('tile_clicked - row: %d column: %d', clicked_row, clicked_column);
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
  let idx = -1;

  let svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  if (svg) {
    idx = PlayerHand.get_open_slot();
    if (!no_drag) svg.setAttributeNS(null, 'class', 'player_tile_svg');
    svg.setAttributeNS(null, 'id', "tile_" + tile.id);
    svg.setAttributeNS(null, 'x', startx + idx*CELL_SIZE);
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

      PlayerHand.tiles[idx] = new Tile(svg, drag_rec, idx, Tile.in_hand);
    }
  }

  // console.log("in setup_tile_for_play: ", PlayerHand.tiles[idx]);
  return svg;
}

function set_tile_props(jtile) {
  let svg = document.getElementById("tile_" + jtile.id);
  if (svg) {
    let r = svg.childNodes[0];
    r.setAttributeNS(null, 'fill', jtile.fill);
    svg.classList.remove('player_tile_svg');
  }
  else {
    svg = setup_tile_for_play(jtile, true);
    svg.setAttributeNS(null, 'x', (jtile.col - 1)*CELL_SIZE);
    svg.setAttributeNS(null, 'y', (jtile.row - 1)*CELL_SIZE);
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

  repatriate_played_tiles();
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
  var has_error = false;
  // error responses
  if (resp[0].err_msg) {
    handle_err_response(resp);
    has_error = true;

  } else { // handle the data response
    let new_data = resp[0].new_data;
    let word_tiles = resp[0].word_tiles;

    // first, dump the drags and set the correct fill
    // and get rid of the '.player_tile_svg' class
    for (let i = 0; i < word_tiles.length; i++) {
      let tile = PlayStarts.find(item => {
        return item.id == "tile_" + word_tiles[i].id;
      })
      if (tile) {
        tile.drag.remove();
        tile.svg.classList.remove('player_tile_svg');
        tile.svg.childNodes[0].setAttributeNS(null, "fill", word_tiles[i].fill);
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

  PlayStarts = [];
  return has_error;
}

// jsonify the just-played-tiles and send them back to the server
function clicked_player_name(event) {

  // if the active player clicked the other player's name
  if (event.currentTarget.textContent == 'Wait ...') return;

  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (URL_x == "/player1") {
    let txt = document.getElementById("scoreboard_player_1");
    if (txt.textContent == "Wait ...") return;
  }
  else if (URL_x == "/player2") {
    let txt = document.getElementById("scoreboard_player_2");
    if (txt.textContent == "Wait ...") return;
  }

  let jsons = get_played_JSONS();
  jsons.unshift({"type" : "regular_play"});

  // console.log("in clicked_player_name: " + JSON.stringify(jsons));
  ws.send(JSON.stringify(jsons));

  // console.log("clicked on ", event.currentTarget.innerHTML);
}

function get_player_hand_JSONS() {
  let jsons = [];
  PlayerHand.tiles.forEach((item, i) => {
    jsons.push(item.get_JSON());
  });

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
  PlayTrash.forEach( item => {
    jsons.push(item.get_JSON());
  });
  return jsons;
}

function repatriate_played_tiles() {

  if (PlayStarts.length > 0) {
    PlayStarts.forEach(item => {
      if (item.status & Tile.is_blank)
        item.svg.childNodes[TEXT_POSITION].textContent = " ";
      PlayerHand.add(item);
    });
  }
  PlayStarts = [];
  PlayTrash = [];
}

function clicked_tiles_area(event) {

  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (URL_x == "/player1") {
    let txt = document.getElementById("scoreboard_player_1");
    if (txt.textContent == "Wait ...") return;
  }
  else if (URL_x == "/player2") {
    let txt = document.getElementById("scoreboard_player_2");
    if (txt.textContent == "Wait ...") return;
  }

  let jsons = null;

  // if not enough tiles to complete, consider this a pass
  let tiles_left = parseInt(document.getElementById("scoreboard_tiles_left_value").textContent);
  if (PlayTrash.length == 0 && tiles_left < NUM_PLAYER_TILES ||
      PlayTrash.length > tiles_left) {
    window.alert("Not enough tiles left to complete the play - THIS IS A PASS")
    repatriate_played_tiles();
    jsons =[{"type" : "pass"}];
  }

  else {
    if (PlayTrash.length == 0 &&
        window.confirm("Are you sure you want to trade all of your tiles?")) {
      jsons = get_player_hand_JSONS();
      erase_player_hand();

    } else if (PlayTrash.length > 0) {
        // roll back if no confirm
        if (window.confirm("Are you sure you want to trade " + PlayTrash.length + " of your tiles?")) {
          jsons = get_played_trash_JSONS();
        }
        // move the trashed tiles back to the player tile area
        else {
          repatriate_played_tiles();
        }
      }
    else return;
  }

  if (jsons.length > 0) {
    if (!jsons[0].type)
      jsons.unshift({"type" : "xchange"});
    ws.send(JSON.stringify(jsons));
  }

  // console.log("clicked on " + event.currentTarget.innerHTML);
}

function clicked_save_btn(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (window.confirm("Save game?")) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", URL_x + "/save_game", true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = URL_x;;
          console.log("new_btn.callback: port: " + ws_port);
        }
    }

    console.log("clicked_save_btn port: " + ws_port);
    xhr.send(null);
  }
}

function clicked_home_btn(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (window.confirm("Close game without saving?")) {
    let game_id = document.getElementById("current_game_id").value;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", URL_x + "/home_page?" + game_id, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = "/home_page";
          console.log("home_btn.callback: port: " + ws_port);
        }
    }

    console.log("clicked_home_btn port: " + ws_port);
    xhr.send(null);
  }
}

function clicked_save_close_btn(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  let game_id = document.getElementById("current_game_id").value;

  if (window.confirm("Save and close game?")) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", URL_x + "/save_close_game?" + game_id, true);
    xhr.setRequestHeader("Content-Type", "text/html");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          document.location.href = "/home_page"
          console.log("save_close_btn.callback: port: " + ws_port);
        }
    }

    console.log("clicked_save_close_btn port: " + ws_port);
    xhr.send(null);
  }

  clicked_home_btn(event);

}

function tile_move_start(new_position) {
  let svg = this.element;
  let x = svg.getAttributeNS(null, "x");
  let y = svg.getAttributeNS(null, "y");

  let phi = -1;
  let tile = PlayerHand.tiles.find((t, idx) => {
    if (t && t.svg == svg) {
      phi = idx;
      return t;
    }
  });

  if (tile) {
    PlayStarts.push(tile);
    // console.log("tile_move_start: ", tile.get_JSON());
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

  row = Math.round(Scale*new_position.top/CELL_SIZE + 1);
  col = Math.round(Scale*new_position.left/CELL_SIZE + 1);

  let svg = this.element;

  // if dragging within the player-hand area ...
  if (row == 1 && col > 16 && col < 24) {
    let cur_location_idx = col - 17;
    PlayerHand.rearrange_hand(svg, cur_location_idx);
    // console.log("tile_moving - player hand idx: " + (col - 17));
  }

  // Upto this point all tiles have a PlainDraggable wrapper that uses
  // css' translate. So, the tiles.svg have the original player_hand
  // coordinates and a translate field. In tile_clicked this causes issues
  // with cycling through the player colors because setting the rect color
  // directly doesn't use the css translate. So, fix up the svg coords here.d
  svg.setAttributeNS(null, 'transform', "");
  svg.setAttributeNS(null, 'x', (col - 1)*CELL_SIZE);
  svg.setAttributeNS(null, 'y', (row - 1)*CELL_SIZE);

  // console.log('tile_moving - row: %d column: %d this.rect.width: %f Scale: %f',
    // row, col, this.rect.width, Scale);
}

function tile_moved(new_position) {
  // 'this' references the PlainDraggable instance
  Scale = CELL_SIZE / this.rect.width;
  var row = -1;
  var col = -1;
  var letter;

  let svg = this.element;
  let tile = PlayerHand.tiles.find(t => { return t && t.svg == svg });

  col = Math.round(Scale*new_position.left/CELL_SIZE) + 1;
  row = Math.round(Scale*new_position.top/CELL_SIZE) + 1;

  if (tile) {
    tile.move(row, col);

    // console.log('finished drag at - row: %d column: %d', row, col);

    // if stopped dragging within the player-hand area don't
    // want that PlayStart to hang around
    if (row == 1 && col > 16 && col < 24) {
      // if it's the magic s being rearranged, don't let it
      if (tile.status & Tile.is_magic_s)
        PlayerHand.rearrange_hand(tile.svg, 7);
      PlayStarts.pop();
      // console.log("tile_moving - rearranged hand to: " + (col - 17));
    }

    // TODO ugly
    else if (row >= 3 && row <= 5 &&
      col >= 18 && col <= 20) {
      // console.log("tile to trash ...");
      tile.state |= Tile.trashed;
      PlayerHand.remove(tile);
      PlayTrash.push(tile);
    }
    // the tile may have been moved off the board
    else if (row <= NUM_ROWS_COLS && row > 0 &&
            col <= NUM_ROWS_COLS && col > 0) {
      tile.status |= Tile.on_board;
      PlayerHand.remove(tile);
      if (tile.status & Tile.is_blank) {
        letter = window.prompt("Please type the letter to use: ");
        if (letter) {
          while (!char_regex.test(letter)) {
            letter = window.prompt("ONLY A SINGLE CHARACTER a-z or A-Z is acceptable!");
          }
          svg.childNodes[TEXT_POSITION].textContent = letter.trim().toLowerCase();
        }
        // console.log("blank tile moved: " + letter);
      }
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

// Only called on a page load
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

    // this is the magic s - keep track of it
    if (idx == 7)
      PlayerHand.tiles.push(new Tile(item, drag_rec, idx, Tile.in_hand | Tile.is_magic_s));
    else
      PlayerHand.tiles.push(new Tile(item, drag_rec, idx, Tile.in_hand));
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

  // console.log("in update_the_board");
}

function handle_exchange(resp) {
  // console.log("in handle_exchange: " + JSON.stringify(resp));

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

  PlayStarts = [];
  PlayTrash = [];
}

function handle_pass(resp) {
  // update the scoreboard
  for (let i = 0; i < resp[0].new_data.length; i++) {
    if (update_scoreboard(resp[0].new_data[i])) {;}
  }
}

function toggle_player() {

  let url = window.location.href;
  url.indexOf("player1") > -1 ? URL_x = "/player2" : URL_x = "/player1";

  let game_id = document.getElementById("current_game_id").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", URL_x, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        document.location.href = URL_x + "?" + game_id;
      }
  }

  xhr.send(null);

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

var ws_port = document.getElementById("ws_port").value;
var is_practice = document.getElementById("is_practice").value;

// const ws = new WebSocket('ws://drawbridgecreativegames.com:3043');
const ws = new WebSocket('ws://192.168.0.16:' + ws_port);

ws.onmessage = function(msg) {

  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  let err = false;

  let resp = JSON.parse(msg.data);

  // need this for vectoring control
  let type = resp.shift();

  // this data should be going to both players. The inactive player
  // needs to handle the data differently - ignore the new player-hand tiles
  // and just show the played tiles and scoreboard
  let player = resp.shift();

  // info goes to the inactive player for a 'heads-up'
  let info = resp.shift();

  console.log("in onmessage: port = " + ws_port);
  console.log("in onmessage: player = " + player.player + " URL = " + URL_x);
  // console.log("in onmessage: msg = " + msg.data);

  if (type.type == "game_over") {
    handle_game_over(resp);
  }

  else if (type.type == "pass") {
    if (player.player != URL_x)
      alert(info.info);
    handle_pass(resp);
  }

  else if (type.type == "xchange") {
    if (player.player == URL_x) {
      handle_exchange(resp);
    }
    else {
      // update the scoreboard
      let new_data = resp[0].new_data;
      for (let i = 0; i < new_data.length; i++) {
        if (update_scoreboard(new_data[i])) {;}
      }
      alert(info.info);
    }
  }

  else if (type.type == "regular_play") {
    if (player.player == URL_x)
      err = handle_the_response(resp);
    else {
      update_the_board(resp);
      if (info.info != "none")
        alert(info.info);
    }
  }

  else {
    console.log("in onmessage: no play type");
  }

  // in this case a single player is playing both player1 and player2
  if (is_practice && !err) {
    toggle_player();
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
