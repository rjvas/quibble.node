/*
 * Heist
 * Drawbridge Creative https://drawbridgecreative.com
 * copyright 2021
 */

// Detect Firefox
var firefoxAgent = window.navigator.userAgent.indexOf("Firefox") > -1;
var chromeAgent = window.navigator.userAgent.indexOf("Chrome") > -1;

var is_practice = document.getElementById("is_practice").value;
var is_admin = document.getElementById("is_admin").value;
var grid_offset_xy =parseInt(document.getElementById("scorebd_xy_offset").value); 
var player_panel_wh = parseInt(document.getElementById("player_panel_wh").value);
var player_hand_xy_offset = parseInt(document.getElementById("player_hand_xy_offset").value);
var tiles_left_offset = parseInt(document.getElementById("tiles_left_offset").value);
var current_player = document.getElementById("current_player").value;

var ws_port = document.getElementById("ws_port").value;

var URL_x = null;
var AppSpace = null;
var Scale = 1.0;
var ChatWin = null;
var ChatDoc = null;
var Chat = null;

const NUM_ROWS_COLS = 15;
const CELL_SIZE = 35;
const GRID_SIZE = CELL_SIZE*NUM_ROWS_COLS;

const SAFETY_FILL = 'rgba(68,187,85,1)';
const SAFETY_FILL_LITE = 'rgba(68,187,85,.3)';
const CENTER_FILL = 'rgba(255,153,204,1)';

const SAFE_INDEXES = [{
    row: 1,
    col: 1,
    rect: null
  },
  {
    row: 1,
    col: NUM_ROWS_COLS,
    rect: null
  },
  {
    row: 2,
    col: 2,
    rect: null
  },
  {
    row: 2,
    col: NUM_ROWS_COLS - 1,
    rect: null
  },
/* out as per email on 20210522
  {
    row: 3,
    col: 3,
    rect: null
  },
  {
    row: 3,
    col: NUM_ROWS_COLS - 2,
    rect: null
  },
*/
  {
    row: NUM_ROWS_COLS,
    col: 1,
    rect: null
  },
  {
    row: NUM_ROWS_COLS,
    col: NUM_ROWS_COLS,
    rect: null
  },
  {
    row: NUM_ROWS_COLS - 1,
    col: 2,
    rect: null
  },
  {
    row: NUM_ROWS_COLS - 1,
    col: NUM_ROWS_COLS - 1,
    rect: null
  },
/* out as per email on 20210522
  {
    row: NUM_ROWS_COLS - 2,
    col: 3,
    rect: null
  },
  {
    row: NUM_ROWS_COLS - 2,
    col: NUM_ROWS_COLS - 2,
    rect: null
  },
*/
  {
    row: 1,
    col: Math.round(NUM_ROWS_COLS / 2),
    rect: null
  },
  {
    row: Math.round(NUM_ROWS_COLS / 2),
    col: 1,
    rect: null
  },
  {
    row: Math.round(NUM_ROWS_COLS / 2),
    col: NUM_ROWS_COLS,
    rect: null
  },
  {
    row: NUM_ROWS_COLS,
    col: Math.round(NUM_ROWS_COLS / 2),
    rect: null
  }
];

const NUM_PLAYER_TILES = 7;
const RECT_POSITION = 0;
const TEXT_POSITION = 1;
const BLANK_TILE = " ";
const char_regex = /^[a-z]{1}$|^[A-Z]{1}$/;
const back_ground = "#f5efe6ff";
var scoreboard = null;

class Tile {
  constructor(svg, drag, idx, status) {

    this.id = svg.getAttributeNS(null, "id");
    this.char = svg.childNodes[1].textContent;
    this.row = Math.round(svg.getAttributeNS(null, "y") / CELL_SIZE) + 1;
    this.column = Math.round(svg.getAttributeNS(null, "x") / CELL_SIZE) + 1;
    this.player_hand_idx = idx;
    this.svg = svg;
    this.drag = drag;

    this.status = status > -1 ? status : Tile.in_hand;
    if (this.char == BLANK_TILE) this.status |= Tile.is_blank;
  }

  get_JSON() {
    return {
      id: this.id,
      char: this.char,
      x: this.svg.getAttributeNS(null, "x"),
      y: this.svg.getAttributeNS(null, "y"),
      row: this.row,
      col: this.column,
      status : this.status,
      player_hand_idx: this.player_hand_idx
    };
  }

  move(row, col) {

    this.row = row;
    this.column = col;
    let x = (col - 1) * CELL_SIZE;
    let y = (row - 1) * CELL_SIZE;
    this.svg.setAttributeNS(null, "x", x);
    this.svg.setAttributeNS(null, "y", y);

    this.drag = this.drag.position();

    if (Tile.is_on_board(row, col)) {
      this.status |= Tile.on_board;
      if (this.status & Tile.in_hand) this.status ^= Tile.in_hand;
      PlayerHand.remove(this);
    } else if (PlayerHand.is_in_hand(x, y)) {
      if (this.status & Tile.on_board) this.status ^= Tile.on_board;
      if (!PlayerHand.add(this)) {
        console.log(`Cannot add tile ${this.char}/${this.id} to PlayerHand - tile may be dropped!`);
      }
    } else if (Tile.is_in_trash(this.row, this.column)) {
      this.status |= Tile.trashed;
      if (this.status & Tile.in_hand) this.status ^= Tile.in_hand;
      PlayerHand.remove(this);
    }
  }

  is_collision(row,col) {
    let collide = Tile.word_tiles.find((item, i) => {
      let xl = item.getAttributeNS(null, "x");
      let yl = item.getAttributeNS(null, "y");
      let c = Math.round(xl / CELL_SIZE) + 1;
      let r = Math.round(yl / CELL_SIZE) + 1;
      return (r == row && c == col);
    });
    if (collide) return true;
    else {
      // check the 'just-played' tiles
      collide = PlayStarts.find(item => {
        return item != this && item.row == row && item.column == col;
      });
      if (collide) return true;
    }
    return false;
  }

  static word_tiles = [];
  static swapped_tiles = [];

  // these are the legitimate tile states
  static none = 0;
  static in_hand = 1; 
  static on_board = 2;
  static trashed = 4;
  static is_blank = 8;

  static is_in_trash(row, col) {
    if ((AppOrientation == HORIZ && row >= 3 && row <= 5 &&
      col >= 18 && col <= 20) ||
      (AppOrientation == VERT && row >= 18 && row <= 20 &&
        col >= 3 && col <= 5))
      return true;
    return false;
  }

  static is_on_board(row, col) {
    if (row > 0 && row < 16 &&
      col > 0 && col < 16) {
      return true;
    } else {
      return false;
    }
  }
}

class PlayerHand {
  constructor() {}
  static tiles = [];
  static squares = 
      [
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+0*2*CELL_SIZE 
        },
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+1*2*CELL_SIZE 
        },
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+2*2*CELL_SIZE 
        },
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+3*2*CELL_SIZE 
        },
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+4*2*CELL_SIZE 
        },
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+5*2*CELL_SIZE 
        },
        {
          "x": CELL_SIZE*15+tiles_left_offset+10,
          "y": player_hand_xy_offset+6*2*CELL_SIZE 
        }
      ];

  static set_tile_attrs(idx, relative, value) {
    if (PlayerHand.tiles[idx]) {
      
      // set the col relative to last position or absolutely
      // from the passed value
      if (relative && idx + value >= 0 && idx + value < NUM_PLAYER_TILES) {
        PlayerHand.tiles[idx].svg.setAttributeNS(null, "x", PlayerHand.squares[idx + value].x);
        PlayerHand.tiles[idx].svg.setAttributeNS(null, "y", PlayerHand.squares[idx + value].y);
      }

      PlayerHand.tiles[idx].player_hand_idx = idx;
      // coords just swapped for horiz to vert
      PlayerHand.tiles[idx].svg.setAttributeNS(null, "x", AppOrientation == HORIZ ? PlayerHand.squares[idx].x : PlayerHand.squares[idx].y);
      PlayerHand.tiles[idx].svg.setAttributeNS(null, "y", AppOrientation == HORIZ ? PlayerHand.squares[idx].y : PlayerHand.squares[idx].x);
      PlayerHand.tiles[idx].svg.setAttributeNS(null, "width", 2*CELL_SIZE);
      PlayerHand.tiles[idx].svg.setAttributeNS(null, "height", 2*CELL_SIZE);
      PlayerHand.tiles[idx].svg.setAttributeNS(null, "transfom", "");
      PlayerHand.tiles[idx].drag = PlayerHand.tiles[idx].drag.position();
    }
  }

  static rearrange_hand(svg, to_idx) {

    let tile = PlayerHand.tiles.find((t,idx) => {
      if (t && t.svg == svg && t.player_hand_idx != idx)
        t.player_hand_idx = idx;
      return t && t.svg == svg;
    });

    // if the tile is found in the hand, null the reference
    // so we don't wind up with multiple copies of the same
    // tile in the PlayerHand
    if (tile) PlayerHand.tiles[tile.player_hand_idx] = null;

    if (!tile)
      tile = PlayStarts.find(t => {
        return t && t.svg == svg;
      });

    let x = svg.getAttributeNS(null, "x");
    let y = svg.getAttributeNS(null, "y");

    // if the to_index is the same as the player_hand_idx then recalc the
    // to_idx from the tile.x/y (gets updated in tile_moving)
    let to_sq = null;
    if (to_idx == tile.player_hand_idx) {
      if (AppOrientation == HORIZ) { // xy explicit
        PlayerHand.squares.find((s,idx) => {
          if (y >= s.y && y < s.y + 2*CELL_SIZE)
            to_idx = idx;
        });
      } else {
        PlayerHand.squares.find((s,idx) => {
          // for AppOrientation == VERT the x,y values are reversed
          // (only keeping the HORIZ coords)
          if (x >= s.y && x < s.y + 2*CELL_SIZE)
            to_idx = idx;
        });
      }
    }

    // want to accomdate tiles moved from the board, also
    // move the svgs and update the json.char and json.id
    if (tile) {
      let ts = PlayerHand.tiles;
      let os = PlayerHand.get_open_slot();

      console.log(`rearrange_hand tile x=${x} y=${y} os=${os} to_idx=${to_idx}`);

      // if no open slot, shift in-place
      if (os == -1) os = tile.player_hand_idx;

      if (os < to_idx) { // shift to the front/top
        for (let i = os; i < to_idx; i++) {
          PlayerHand.tiles[i] = PlayerHand.tiles[i + 1];
          PlayerHand.set_tile_attrs(i, true, -1);
        }
      }
      else if (os > to_idx) { // shift to the end/bottom
        for (let i = os; i > to_idx; i--) {
          PlayerHand.tiles[i] = PlayerHand.tiles[i - 1];
          PlayerHand.set_tile_attrs(i, true, 1);
        }
      }

      // else, the case where to_idx is open - which, by now, it should be
      PlayerHand.tiles[to_idx] = tile;
      PlayerHand.set_tile_attrs(to_idx, false, to_idx);
    }
  }

  static is_in_hand(x, y) {
    if ((AppOrientation == HORIZ && x > GRID_SIZE ) ||
        (AppOrientation == VERT && y > GRID_SIZE))
       return true;
    return false;
  }

  static get_open_slot() {
    for (let i = 0; i < PlayerHand.tiles.length; i++) {
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
        tile.status |= Tile.in_hand;
        if (tile.status & Tile.on_board) tile.status ^= Tile.on_board; 
        tile.hand_idx = idx;
        let x = AppOrientation == HORIZ ? PlayerHand.squares[idx].x : PlayerHand.squares[idx].y;
        let y = AppOrientation == HORIZ ? PlayerHand.squares[idx].y : PlayerHand.squares[idx].x;
        tile.svg.setAttributeNS(null, "x", x);
        tile.svg.setAttributeNS(null, "y", y);
        tile.svg.setAttributeNS(null, "width", 2*CELL_SIZE);
        tile.svg.setAttributeNS(null, "height", 2*CELL_SIZE);
        tile.drag = tile.drag.position();
        return true;
      }
    }
    return false;
  }

};

var PlayTrash = [];
var PlayStarts = [];

function svgToScreen(element) {
  var rect = element.getBoundingClientRect();
  return {x: rect.left, y: rect.top, width: rect.width, height: rect.height};
}

function screenToSVG(svg, x, y) { // svg is the svg DOM node
  var pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  var cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  return {x: Math.floor(cursorPt.x), y: Math.floor(cursorPt.y)}
}

function draw_played_tiles() {
  let tiles = Tile.word_tiles;
  tiles.forEach(t => {
    // let y = Math.round(parseInt(t.getAttributeNS(null, 'y'))/CELL_SIZE) + 1;
    let x = parseInt(t.getAttributeNS(null, 'x'));
    let y = parseInt(t.getAttributeNS(null, 'y'));

    t.setAttributeNS(null, "x", x);
    t.setAttributeNS(null, "y", y);
  });
}

// only on an AppOrientation change
function draw_safe_squares() {
  var safe_squares = document.querySelectorAll('.safety_square');

  let ss = null;

  for (let i = 0; i < SAFE_INDEXES.length; i++) {
    ss = safe_squares[i];

    ss.setAttributeNS(null, 'x', (SAFE_INDEXES[i].row - 1) * CELL_SIZE);
    ss.setAttributeNS(null, 'y', (SAFE_INDEXES[i].col - 1) * CELL_SIZE );
  }
}

// only on an AppOrientation change
function draw_center_start() {
  var center_start = document.querySelector('.center_square');
  let x = center_start.getAttributeNS(null, 'x');
  let y = center_start.getAttributeNS(null, 'y');
  center_start.setAttributeNS(null, 'x', x );
  center_start.setAttributeNS(null, 'y', y );
}

function draw_lines() {
  var line_vert = document.querySelectorAll('.line_vertical');
  var line_horiz = document.querySelectorAll('.line_horizontal');

  for (let i = 0; i <= NUM_ROWS_COLS; i++) {
    line_vert[i].setAttributeNS(null, 'x1', i * CELL_SIZE);
    line_vert[i].setAttributeNS(null, 'y1', 0);
    line_vert[i].setAttributeNS(null, 'x2', i * CELL_SIZE);
    line_vert[i].setAttributeNS(null, 'y2', CELL_SIZE * NUM_ROWS_COLS);
    line_vert[i].setAttributeNS(null, 'stroke_width', 1);
  }
  for (let i = 0; i <= NUM_ROWS_COLS; i++) {
    line_horiz[i].setAttributeNS(null, 'x1', 0);
    line_horiz[i].setAttributeNS(null, 'y1', i * CELL_SIZE);
    line_horiz[i].setAttributeNS(null, 'x2', CELL_SIZE * NUM_ROWS_COLS);
    line_horiz[i].setAttributeNS(null, 'y2', i * CELL_SIZE);
    line_horiz[i].setAttributeNS(null, 'stroke_width', 1);
  }

}

function draw_grid() {
  if (AppOrientation == HORIZ) {
    PlaySpace.setAttributeNS(null, "x", grid_offset_xy);
    PlaySpace.setAttributeNS(null, "y", 0);
  } else {
    PlaySpace.setAttributeNS(null, "x", 0);
    PlaySpace.setAttributeNS(null, "y", grid_offset_xy);
  }
  draw_lines();
  draw_safe_squares();
  draw_center_start();
  draw_played_tiles();
}

function draw_player_scorebd() {
  var player1_stats = document.querySelector('#player1_stats');
  var player2_stats = document.querySelector('#player2_stats');
  var player1_lock = document.querySelector('#player1_lock');
  var player2_lock = document.querySelector('#player2_lock');
  var player1_score = document.querySelector('#player1');
  var player2_score = document.querySelector('#player2');
  var player1_photo = document.querySelector('#player1_photo');
  var player2_photo = document.querySelector('#player2_photo');
  var tmp = null;

  // the p1 svg
  tmp = player1_score.getAttributeNS(null, "x");
  player1_score.setAttributeNS(null, "x", player1_score.getAttributeNS(null, "y"));
  player1_score.setAttributeNS(null, "y", tmp);
  tmp = player1_score.getAttributeNS(null, "width");
  player1_score.setAttributeNS(null, "width", player1_score.getAttributeNS(null, "height"));
  player1_score.setAttributeNS(null, "height", tmp);
  
  tmp = player1_stats.getAttributeNS(null, "x");
  player1_stats.setAttributeNS(null, "x", player1_stats.getAttributeNS(null, "y"));
  player1_stats.setAttributeNS(null, "y", tmp);

  // tmp = player1_lock.getAttributeNS(null, "x");
  // player1_lock.setAttributeNS(null, "x", player1_lock.getAttributeNS(null, "y"));
  // player1_lock.setAttributeNS(null, "y", tmp);

  // the p1 photo
  tmp = player1_photo.getAttributeNS(null, "x");
  player1_photo.setAttributeNS(null, "x", player1_photo.getAttributeNS(null, "y"));
  player1_photo.setAttributeNS(null, "y", tmp);
  tmp = player1_photo.getAttributeNS(null, "width");
  player1_photo.setAttributeNS(null, "width", player1_photo.getAttributeNS(null, "height"));
  player1_photo.setAttributeNS(null, "height", tmp);
  
  // the p2 svg
  tmp = player2_score.getAttributeNS(null, "x");
  player2_score.setAttributeNS(null, "x", player2_score.getAttributeNS(null, "y"));
  player2_score.setAttributeNS(null, "y", tmp);
  tmp = player2_score.getAttributeNS(null, "width");
  player2_score.setAttributeNS(null, "width", player2_score.getAttributeNS(null, "height"));
  player2_score.setAttributeNS(null, "height", tmp);

  tmp = player2_stats.getAttributeNS(null, "x");
  player2_stats.setAttributeNS(null, "x", player2_stats.getAttributeNS(null, "y"));
  player2_stats.setAttributeNS(null, "y", tmp);

  // tmp = player2_lock.getAttributeNS(null, "x");
  // player2_lock.setAttributeNS(null, "x", player2_lock.getAttributeNS(null, "y"));
  // player2_lock.setAttributeNS(null, "y", tmp);

  // the p2 photo
  tmp = player2_photo.getAttributeNS(null, "x");
  player2_photo.setAttributeNS(null, "x", player2_photo.getAttributeNS(null, "y"));
  player2_photo.setAttributeNS(null, "y", tmp);
  tmp = player2_photo.getAttributeNS(null, "width");
  player2_photo.setAttributeNS(null, "width", player2_photo.getAttributeNS(null, "height"));
  player2_photo.setAttributeNS(null, "height", tmp);
}

// only on an AppOrientation change
function draw_scorebd() {
  // this gets the scoreboard svg not background
  var scoreboard = document.querySelector('#scoreboard');
  var scoreboard_bg = document.querySelector('#scoreboard_bg');
  var back_arrow = document.querySelector('#back_arrow');
  var p1_vs_p2 = document.querySelector('#p1_vs_p2');
  var tmp = null;

  if (AppOrientation == HORIZ) {
    scoreboard.setAttributeNS(null, 'width', grid_offset_xy);   
    scoreboard.setAttributeNS(null, 'height', CELL_SIZE*NUM_ROWS_COLS);   
    scoreboard_bg.setAttributeNS(null, 'width', grid_offset_xy);   
    scoreboard_bg.setAttributeNS(null, 'height', CELL_SIZE*NUM_ROWS_COLS);   
  }
  else {
    scoreboard.setAttributeNS(null, 'width', CELL_SIZE*NUM_ROWS_COLS );   
    scoreboard.setAttributeNS(null, 'height', grid_offset_xy);   
    scoreboard_bg.setAttributeNS(null, 'width', CELL_SIZE*NUM_ROWS_COLS );   
    scoreboard_bg.setAttributeNS(null, 'height', grid_offset_xy);   
  }

  tmp = back_arrow.getAttributeNS(null, "x");
  back_arrow.setAttributeNS(null, "x", back_arrow.getAttributeNS(null, "y"));
  back_arrow.setAttributeNS(null, "y", tmp);
  tmp = p1_vs_p2.getAttributeNS(null, "x");
  p1_vs_p2.setAttributeNS(null, "x", p1_vs_p2.getAttributeNS(null, "y"));
  p1_vs_p2.setAttributeNS(null, "y", tmp);

  draw_player_scorebd();
}

function move_ctrls() {
  var chat_svg = document.querySelector('#chat_ctrl');
  var chat_click = document.querySelector('#chat_on_click')
  var recall_svg = document.querySelector('#recall_ctrl');
  var recall_click = document.querySelector('#recall_on_click')
  var play_svg = document.querySelector('#play_ctrl');
  var play_click = document.querySelector('#play_on_click')
  var swap_svg = document.querySelector('#swap_ctrl');
  var swap_click = document.querySelector('#swap_on_click')
  var pass_svg = document.querySelector('#pass_ctrl');
  var pass_click = document.querySelector('#pass_on_click')

  let tmp = chat_svg.getAttributeNS(null, "x");
  chat_svg.setAttributeNS(null, "x", chat_svg.getAttributeNS(null, "y"));
  chat_svg.setAttributeNS(null, "y", tmp);
  tmp = chat_click.getAttributeNS(null, "x");
  chat_click.setAttributeNS(null, "x", chat_click.getAttributeNS(null, "y"));
  chat_click.setAttributeNS(null, "y", tmp);

  tmp = recall_svg.getAttributeNS(null, "x");
  recall_svg.setAttributeNS(null, "x", recall_svg.getAttributeNS(null, "y"));
  recall_svg.setAttributeNS(null, "y", tmp);
  tmp = recall_click.getAttributeNS(null, "x");
  recall_click.setAttributeNS(null, "x", recall_click.getAttributeNS(null, "y"));
  recall_click.setAttributeNS(null, "y", tmp);
  
  tmp = play_svg.getAttributeNS(null, "x");
  play_svg.setAttributeNS(null, "x", play_svg.getAttributeNS(null, "y"));
  play_svg.setAttributeNS(null, "y", tmp);
  tmp = play_click.getAttributeNS(null, "x");
  play_click.setAttributeNS(null, "x", play_click.getAttributeNS(null, "y"));
  play_click.setAttributeNS(null, "y", tmp);

  tmp = swap_svg.getAttributeNS(null, "x");
  swap_svg.setAttributeNS(null, "x", swap_svg.getAttributeNS(null, "y"));
  swap_svg.setAttributeNS(null, "y", tmp);
  tmp = swap_click.getAttributeNS(null, "x");
  swap_click.setAttributeNS(null, "x", swap_click.getAttributeNS(null, "y"));
  swap_click.setAttributeNS(null, "y", tmp);

  tmp = pass_svg.getAttributeNS(null, "x");
  pass_svg.setAttributeNS(null, "x", pass_svg.getAttributeNS(null, "y"));
  pass_svg.setAttributeNS(null, "y", tmp);
  tmp = pass_click.getAttributeNS(null, "x");
  pass_click.setAttributeNS(null, "x", pass_click.getAttributeNS(null, "y"));
  pass_click.setAttributeNS(null, "y", tmp);
}

function draw_controls(){
  // this is an svg rect
  var player_panel = document.querySelector('#player_panel');

  if (AppOrientation == HORIZ) {
    player_panel.setAttributeNS(null, 'x', CELL_SIZE*NUM_ROWS_COLS);   
    player_panel.setAttributeNS(null, 'y', 0);   
    player_panel.setAttributeNS(null, 'width', player_panel_wh);   
    player_panel.setAttributeNS(null, 'height', CELL_SIZE*NUM_ROWS_COLS);   
    player_panel.setAttributeNS(null, 'fill', "black");   
  }
  else {
    player_panel.setAttributeNS(null, 'x', 0);   
    player_panel.setAttributeNS(null, 'y',  CELL_SIZE*NUM_ROWS_COLS);   
    player_panel.setAttributeNS(null, 'width', CELL_SIZE*NUM_ROWS_COLS );   
    player_panel.setAttributeNS(null, 'height', player_panel_wh);   
    player_panel.setAttributeNS(null, 'fill', "black");   
  }
  move_ctrls();
}

function draw_tiles_left() {
  var left_tiles = document.querySelector('#tiles_left');
  var left_tiles_vert = document.querySelector('#tiles_left_vert');
  var left_tiles_count = document.querySelector('#tiles_left_count');

  let tmp = left_tiles_count.getAttributeNS(null, "x");

  if (AppOrientation == HORIZ) {
    left_tiles.setAttributeNS(null, "x", 275);
    left_tiles.setAttributeNS(null, "y", 125);
    left_tiles_vert.setAttributeNS(null, "transform", "rotate(-90.5876, 277.2, 136.8)");
    left_tiles_count.setAttributeNS(null, "x", 550);
    left_tiles_count.setAttributeNS(null, "y", 175);
  } else {
    left_tiles.setAttributeNS(null, "x", -20);
    left_tiles.setAttributeNS(null, "y", 415);
    left_tiles_vert.setAttributeNS(null, "transform", "rotate(0, 277.2, 136.8)");
    left_tiles_count.setAttributeNS(null, "x", 350);
    left_tiles_count.setAttributeNS(null, "y", 557);
  }
}

function draw_player_hand() {
  let tmp = null;
  PlayerHand.tiles.forEach(t => {
    if (t) {
      tmp = t.svg.getAttributeNS(null, "x");
      t.svg.setAttributeNS(null, "x", t.svg.getAttributeNS(null, "y"));
      t.svg.setAttributeNS(null, "y", tmp);
      t.svg.setAttributeNS(null, "width", CELL_SIZE*2);
      t.svg.setAttributeNS(null, "height", CELL_SIZE*2);
      t.drag = t.drag.position();
    }
  });
}

// only on an AppOrientation switch
function draw_board() {
  draw_scorebd();
  draw_grid();
  draw_controls();
  draw_tiles_left();
  draw_player_hand();
}

function clicked_player_area(event) {
  var player = null;
  if (event.currentTarget.id == "player_1_area") {
    color_picker.player = "player_1";
  } else if (event.currentTarget.id == "player_2_area") {
    color_picker.player = "player_2";
  }
  var clr = event.currentTarget.getAttributeNS(null, "fill");
  color_picker.picker.setOptions({
    popup: 'right',
    color: clr
  });
  color_picker.picker.show();
}

function build_sub_struct(tile, idx, svg, id_prefix) {

    if (!id_prefix)
      id_prefix = "tile_"

    svg.setAttributeNS(null, 'id', id_prefix + tile.id);
    if (idx == -1) {
      // a played tile - not in the hand
      svg.setAttributeNS(null, 'x', (tile.column - 1) * CELL_SIZE);
      svg.setAttributeNS(null, 'y', (tile.row - 1) * CELL_SIZE);
      svg.setAttributeNS(null, 'width', CELL_SIZE);
      svg.setAttributeNS(null, 'height', CELL_SIZE);
    } else {
      svg.setAttributeNS(null, 'x', AppOrientation==HORIZ ? PlayerHand.squares[idx].x : PlayerHand.squares[idx].y);
      svg.setAttributeNS(null, 'y', AppOrientation==HORIZ ? PlayerHand.squares[idx].y : PlayerHand.squares[idx].x);
      svg.setAttributeNS(null, 'width', 2*CELL_SIZE);
      svg.setAttributeNS(null, 'height', 2*CELL_SIZE);
      if (id_prefix == "swap_")
        svg.addEventListener("click", swap_tile_clicked);
    }
    svg.setAttributeNS(null, 'viewBox', `0 0 ${CELL_SIZE} ${CELL_SIZE}`);
    svg.setAttributeNS(null, 'fill', 'none');

    // rect and text position attributes are always relative to the svg
    let r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttributeNS(null, 'x', 0);
    r.setAttributeNS(null, 'y', 0);
    r.setAttributeNS(null, 'width', CELL_SIZE);
    r.setAttributeNS(null, 'height', CELL_SIZE);
    r.setAttributeNS(null, 'fill', tile.fill);
    r.setAttributeNS(null, 'stroke_width', 1);
    r.setAttributeNS(null, 'stroke', '#000');
    r.setAttributeNS(null, 'class', 'tile_rect');

    let t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttributeNS(null, 'x', CELL_SIZE / 2);
    t.setAttributeNS(null, 'y', CELL_SIZE / 2);
    t.setAttributeNS(null, 'width', CELL_SIZE);
    t.setAttributeNS(null, 'height', CELL_SIZE);
    t.setAttributeNS(null, 'stroke_width', 2);
    t.setAttributeNS(null, 'stroke', '#000');
    t.setAttributeNS(null, 'text-anchor', "middle");
    t.setAttributeNS(null, 'alignment-baseline', "central");
    t.setAttributeNS(null, 'class', 'tile_text');
    t.textContent = tile.char;
    // t.addEventListener("click", tile_clicked);

    let p = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    p.setAttributeNS(null, 'x', CELL_SIZE - 2);
    p.setAttributeNS(null, 'y', CELL_SIZE - 10);
    // p.setAttributeNS(null, 'style', { font: "italic 8px sans-serif" });
    p.setAttributeNS(null, 'width', CELL_SIZE / 10);
    p.setAttributeNS(null, 'height', CELL_SIZE / 10);
    p.setAttributeNS(null, 'stroke_width', 1);
    p.setAttributeNS(null, 'stroke', '#000');
    p.setAttributeNS(null, 'text-anchor', "end");
    p.setAttributeNS(null, 'alignment-baseline', "central");
    p.setAttributeNS(null, 'class', 'tile_points');
    p.textContent = tile.points;

    svg.append(r);
    svg.append(t);
    svg.append(p);
  }

// these are NEW tiles created async during play
function setup_tile_for_play(tile, no_drag) {

  let idx = -1;

  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (svg) {
    idx = PlayerHand.get_open_slot();
    
    if (!no_drag) svg.setAttributeNS(null, 'class', 'player_tile_svg');
    
    build_sub_struct(tile, idx, svg);

    PlaySpace.append(svg);

    if (!no_drag) {
      let drag_rec = new PlainDraggable(svg);

      drag_rec.onMove = tile_moving;
      drag_rec.onDragEnd = tile_moved;
      drag_rec.onDragStart = tile_move_start;

      drag_rec.autoScroll = true;
      drag_rec.containment = {
        left: 0,
        top: 0,
        width: "100%",
        height: "100%"
        // width: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'width'),
        // height: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'height')
      } 

      drag_rec.snap = {CELL_SIZE};
      PlayerHand.tiles[idx] = new Tile(svg, drag_rec, idx, Tile.in_hand);
    }
    else Tile.word_tiles.push(svg);
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
  } else {
    svg = setup_tile_for_play(jtile, true);
    // svg.setAttributeNS(null, 'x', (jtile.column - 1) * CELL_SIZE);
    // svg.setAttributeNS(null, 'y', (jtile.row - 1) * CELL_SIZE);
  }
}

function get_played_JSONS() {
  let check_jsons = [];
  let tile_svgs = document.querySelectorAll('.player_tile_svg');

  // for now, a sanity check
  // DEBUG
  tile_svgs.forEach(item => {
    let x = item.getAttributeNS(null, "x");
    let y = item.getAttributeNS(null, "y");
    let col = Math.round(x / CELL_SIZE) + 1;
    let row = Math.round(y / CELL_SIZE) + 1;
    // if these are the played tiles ...
    if (x >= 0 && y >= 0 &&
      x < NUM_ROWS_COLS * CELL_SIZE && y < NUM_ROWS_COLS * CELL_SIZE) {
      check_jsons.push({
        id: item.id,
        row : row,
        column : col
      });
    }
  });

  let jsons = [];
  PlayStarts.forEach((item, i) => {
    if (cross_chk(item.id))
      jsons.push(item.get_JSON());
    else {
      console.log(`ERROR: get_played_JSONS: ${item.char}/${item.id} not on the board`);
    }
  });

  function cross_chk(id) {
    for (let i = 0; i < check_jsons.length; i++) {
      if (check_jsons[i].id == id) return true;
    }
    return false;
  }

  return jsons;
}

function handle_err_response(resp) {
  let err_msg = resp[0].err_msg;
  alert(err_msg);

  clicked_recall();
}

function update_scoreboard(item, data) {
  let ret_val = true;
  if (data.scoreboard_player_1_name) {
    item = document.getElementById("player1_name");
    if (item) item.textContent = data.scoreboard_player_1_name;
  } else if (data.scoreboard_player_1_score) {
    item = document.getElementById("player1_score");
    if (item) item.textContent = data.scoreboard_player_1_score;
  } else if (data.scoreboard_player_1_safe_score) {
    item = document.getElementById("player1_lock_pts");
    if (item) item.textContent = data.scoreboard_player_1_safe_score;
  } else if (data.scoreboard_player_2_name) {
    item = document.getElementById("player2_name");
    if (item) item.textContent = data.scoreboard_player_2_name;
  } else if (data.scoreboard_player_2_score) {
    item = document.getElementById("player2_score");
    if (item) item.textContent = data.scoreboard_player_2_score;
  } else if (data.scoreboard_player_2_safe_score) {
    item = document.getElementById("player2_lock_pts");
    if (item) item.textContent = data.scoreboard_player_2_safe_score;
  } else if (data.tiles_left_value >= 0) {
    item = document.getElementById("tiles_left_count");
    if (item) item.textContent = data.tiles_left_value;
  } else
    ret_val = false;

  return ret_val;
}

function handle_the_response(resp) {
  var has_error = false;
  // error responses
  if (resp && resp[0] && resp[0].err_msg) {
    handle_err_response(resp);
    has_error = true;

  } else if (resp && resp[0]) { // handle the data response
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
        // finally, stuff it in the Tile.word_tiles for collision control
        Tile.word_tiles.push(tile.svg);
      }
    }

    // now update the play data
    let item = null;
    for (let i = 0; i < new_data.length; i++) {
      if (update_scoreboard(item, new_data[i])) {
        ;
      } else if (new_data[i].play_data) {
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
    return has_error;
  }

  // now stuff the word tiles into an easily accessable list - for drag control
  Tile.word_tiles = [];
  tile_svgs = document.querySelectorAll('.word_tile_svg');
  tile_svgs.forEach((item, idx) => {
    Tile.word_tiles.push(item);
  });

  PlayStarts = [];
  return has_error;
}

// jsonify the just-played-tiles and send them back to the server
function clicked_play(event) {

  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (current_player != URL_x) {
    clicked_recall();
    alert(`You are not the current player - please wait ...`);
    return;
  }

  let jsons = get_played_JSONS();
  jsons.unshift({
    "type": "regular_play"
  });

  // console.log("in clicked_play: " + JSON.stringify(jsons));
  if (jsons.length > 1)
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

function erase_player_hand(jsons) {
  let back_fill = PlaySpace.getAttributeNS(null, "fill");

  for (let i = 0; i < jsons.length; i++) {
    let tile = PlayerHand.tiles[jsons[i].player_hand_idx];
    tile.svg.childNodes[0].setAttributeNS(null, "fill", "white");
    tile.svg.childNodes[1].setAttributeNS(null, "stroke", "white");
    tile.svg.childNodes[2].setAttributeNS(null, "stroke", "white");
    PlayerHand.tiles[jsons[i].player_hand_idx] = null;
  }
}

function get_swap_JSONS() {
  var jsons = [];
  Tile.swapped_tiles.forEach(item => {
    let id = "tile_" + parseInt(item.split("_")[2]);
    let tile = PlayerHand.tiles.find(t => {
      return t.id == id;
    });
    jsons.push(tile.get_JSON());
  });
  return jsons;
}

function clicked_recall() {

  if (PlayStarts.length > 0) {
    PlayStarts.forEach(item => {
      if (item.status & Tile.is_blank) {
        item.svg.childNodes[TEXT_POSITION].textContent = " ";
        item.char = " "
      }
      if (!PlayerHand.add(item))
        console.log(`clicked_recall: cannot add ${item.char}/${item.id} to PlayerHand`);
    });
  }
  PlayStarts = [];
  PlayTrash = [];
}

function swap_toggle_highlight(svg, no_toggle) {
  var tile_id = svg.getAttributeNS(null, "id");
  let found_id = Tile.swapped_tiles.find(item => {
    return item == tile_id;
  })
  if (!found_id) { // select it
    Tile.swapped_tiles.push(svg.getAttributeNS(null, "id"));
    let highlite = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    highlite.setAttributeNS(null, "x", 2);
    highlite.setAttributeNS(null, "y", 2);
    highlite.setAttributeNS(null, "width", CELL_SIZE - 4);
    highlite.setAttributeNS(null, "height", CELL_SIZE - 4);
    highlite.setAttributeNS(null, "stroke", "red");
    highlite.setAttributeNS(null, "stroke-width", "3");
    svg.appendChild(highlite);
  } else if (!no_toggle) { // unselect it
      let idx = Tile.swapped_tiles.indexOf(found_id);
      if (idx >= 0 && idx < Tile.swapped_tiles.length)
        Tile.swapped_tiles = Tile.swapped_tiles.slice(0, idx).concat(Tile.swapped_tiles.slice(idx + 1));
      svg.removeChild(svg.lastChild);
  }
}

function swap_tile_clicked(event) {
  var svg = null;

  svg = event.currentTarget;
  swap_toggle_highlight(svg);
  // console.log('swap_tile_clicked - row: %d column: %d', clicked_row, clicked_column);
}

function swap_select_all(event) {
  console.log(`in swap_select_all`);
  let pu = document.getElementById("swap_pop");
  let svgs = pu.getElementsByTagName("svg");
  for (i=0; i<svgs.length; i++) {
    let id = svgs[i].getAttributeNS(null, "id");
    swap_toggle_highlight(svgs[i], true);
  }
  // unselect all toggle? i dunno ...
  // let sel_btn = document.getElementById("swap_sel_all");
  // if ()
};

function clicked_swap_cancel(event) {
  let pu = document.getElementById("swap_pop");
  pu.style.display = "none";
  // clear the pu elements
  while (pu.firstChild) {
   pu.removeChild(pu.firstChild)
  }

  Tile.swapped_tiles = [];
}

function clicked_swap_begin(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (current_player != URL_x) {
    clicked_recall();
    alert(`You are not the current player - please wait ...`);
    return;
  }

  let pu = document.getElementById("swap_pop");
  let svg = null;
  PlayerHand.tiles.forEach((t, idx) => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (svg) {
      t.fill = t.svg.childNodes[RECT_POSITION].getAttributeNS(null, "fill");
      build_sub_struct(t, idx, svg, "swap_");
      swap_pop.appendChild(svg); 
    } 
  });
  // now the controls
  var sel = document.createElement("BUTTON"); 
  sel.id = "swap_sel_all";
  sel.textContent = "Select All";
  sel.width = CELL_SIZE*2;
  sel.height = CELL_SIZE;
  sel.onclick = swap_select_all;
  swap_pop.appendChild(sel);

  var swap = document.createElement("BUTTON"); 
  swap.id = "swap_now";
  swap.textContent = "Swap";
  swap.width = CELL_SIZE*2;
  swap.height = CELL_SIZE;
  swap.onclick = clicked_swap_end;
  swap_pop.appendChild(swap);

  var cancel = document.createElement("BUTTON"); 
  cancel.id = "swap_cancel";
  cancel.textContent = "Cancl";
  cancel.width = CELL_SIZE*2;
  cancel.height = CELL_SIZE;
  cancel.onclick = clicked_swap_cancel;
  swap_pop.appendChild(cancel);

  pu.style.display = "block";
}

function clicked_swap_end(event) {
  let pu = document.getElementById("swap_pop");
  pu.style.display = "none";
  // clear the pu elements
  while (pu.firstChild) {
   pu.removeChild(pu.firstChild)
  }

  let jsons = null;

  // if not enough tiles to complete, consider this a pass
  let tiles_left = parseInt(document.getElementById("tiles_left_count").textContent);
  if (Tile.swapped_tiles.length > tiles_left) {
    window.alert("Not enough tiles left to complete the play - THIS IS A PASS")
    clicked_recall();
    jsons = [{
      "type": "pass"
    }];
  } else {
    if (Tile.swapped_tiles.length == 7 &&
      window.confirm("Are you sure you want to trade all of your tiles?")) {
      jsons = get_player_hand_JSONS();
      erase_player_hand(jsons);

    } else if (Tile.swapped_tiles.length > 0) {
      // roll back if no confirm
      if (window.confirm("Are you sure you want to trade " + Tile.swapped_tiles.length + " of your tiles?")) {
        jsons = get_swap_JSONS();
        erase_player_hand(jsons);
      }
      // move the trashed tiles back to the player tile area
      else {
        clicked_recall();
      }
    } else return;
  }

  Tile.swapped_tiles = [];

  if (jsons.length > 0) {
    // type may have been set to 'pass' above
    if (!jsons[0].type)
      jsons.unshift({
        "type": "xchange"
      });
    ws.send(JSON.stringify(jsons));
  }

  // console.log("clicked on " + event.currentTarget.innerHTML);
}

function clicked_cheat_send_btn(event) {
  var cheat = ChatDoc.getElementById("cheat_text");
  var user = document.getElementById("user").value;
  if (cheat && user) {
    let msg = [];
    msg.push({"type" : "cheat"});
    msg.push({"player" : user});
    msg.push({"info" : cheat.value});
    ws.send(JSON.stringify(msg));
  }
}

function clicked_chat_btn() {
  // RJV TEMP
  ChatWin = window.open("", "Chat", "width=300,height=600"); 
  ChatDoc = ChatWin.document;

  let dv = ChatDoc.createElement("div");
  dv.id = "chat_text";
  dv.height = "300";
  dv.width = "600";

  let p = ChatDoc.createElement("p");
  p.id="chat_para"; 
  p.textContent = "<b>Salutations Worderists!</b>";
  dv.appendChild(p);
  
  let ta = ChatDoc.createElement("textarea");
  ta.id = "chat_send_text";
  ta.rows = "2";
  ta.cols = "30";
  ta.wrap = "hard";
  ta.placeholder = "Type here ...";
  dv.appendChild(ta);

  let sb = ChatDoc.createElement("input");
  sb.id = "chat_send_btn";
  sb.type = "button";
  sb.class="button";
  sb.value = "Send";
  sb.height="50";
  sb.width = "50";
  sb.onclick = clicked_chat_send_btn;
  dv.appendChild(sb);

  if (is_admin == "true") {
    ta = document.createElement("textarea"); 
    ta.id = "cheat_text";
    ta.rows = "2"
    ta.cols = "30";
    ta.wrap = "soft";
    ta.placeholder = "Cheat here ...";
    dv.appendChild(ta);

    sb = ChatDoc.createElement("input");
    sb.id = "cheat_send_btn";
    sb.type = "button";
    sb.class="button";
    sb.value = "Send";
    sb.height="50";
    sb.width = "50";
    sb.onclick = clicked_cheat_send_btn;
    dv.appendChild(sb);
  }

  ChatDoc.body.appendChild(dv);

  Chat = ChatDoc.getElementById("chat_para");
}

function clicked_chat_send_btn(event) { 
  let txt = ChatDoc.getElementById("chat_send_text");
  var user = document.getElementById("user").value;
  if (txt && user) {
    let msg = [];
    msg.push({"type" : "chat"});
    msg.push({"player" : user});
    msg.push({"info" : txt.value});
    txt.value = "";

    ws.send(JSON.stringify(msg));
  }
}

function clicked_home_btn(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  let game_id = document.getElementById("current_game_id").value;
  var user = document.getElementById("user").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", URL_x + "/home_page?game=" + game_id + "&user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      document.location.href = "/home_page?user=" + user;
      console.log("home_btn.callback: port: " + ws_port);
    }
  }

  console.log("clicked_home_btn port: " + ws_port);
  xhr.send(null);
}

function clicked_pass(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  if (current_player != URL_x) {
    clicked_recall();
    alert(`You are not the current player - please wait ...`);
    return;
  }

  clicked_recall();
  jsons = [{
    "type": "pass"
  }];
  ws.send(JSON.stringify(jsons));
}

function tile_move_start(new_position) {
  let svg = this.element;

  let phi = -1;
  let tile = PlayerHand.tiles.find((t, idx) => {
    if (t && t.svg == svg) {
      phi = idx;
      return t;
    }
  });

  // if the tile wasn't in the PlayerHand, it's in the
  // PlayStarts array.
  if (!tile) {
    tile = PlayStarts.find(t => {
      return t && t.svg == svg
    });
  }

  if (tile) {
    // tile.svg.setAttributeNS(null, 'width', CELL_SIZE);
    // tile.svg.setAttributeNS(null, 'height', CELL_SIZE);
    PlayStarts.push(tile);
  }

    // console.log("tile_move_start: ", tile.get_JSON());
}

function tile_moving(new_position) {
  // note that there are +1 and -1 conversions on row/col - this is due to
  // using 0-based coordinate system for x/y and 1-based coord system
  // for row/col

  console.log(`tile_moving new_pos: ${Math.round(new_position.left)},${Math.round(new_position.top)}`);

  // just initing ...
  let row = -1;
  let col = -1;

  let svg = this.element;

  let playXY = screenToSVG(PlaySpace, new_position.left, new_position.top);
  console.log(`tile_moving 2screen: ${playXY.x},${playXY.y}`);

  let y = playXY.x;
  let x = playXY.y;

  row = Math.round(x/ CELL_SIZE + 1);
  col = Math.round(y/ CELL_SIZE + 1);
  console.log(`r/c from drag: ${row},${col}`);

  let tile = PlayerHand.tiles.find(t => {
    return t && t.svg == svg
  });
  // if the tile wasn't in the PlayerHand, it's in the
  // PlayStarts array.
  if (!tile) {
    tile = PlayStarts.find(t => {
      return t && t.svg == svg
    });
  }

  x = (col - 1) * CELL_SIZE;
  y = (row - 1) * CELL_SIZE;

  if (PlayerHand.is_in_hand(x, y)) {
    console.log(`tile_moving - tile in_hand xy: ${x}/${y}`);
    PlayerHand.rearrange_hand(svg, tile.player_hand_idx);
  } 
  else if (Tile.is_on_board(row, col)) {
    console.log(`tile_moving - tile on board rc : ${row}/${col}`);
    svg.setAttributeNS(null, "width", CELL_SIZE);
    svg.setAttributeNS(null, "height", CELL_SIZE);
    // if we're moving into another tile, don't let it
    if (tile && tile.is_collision(row, col)) {
      row = tile.row;
      col = tile.column;
    }
  // console.log(`tile_moving collision: tile.row=${tile.row} tile.col=${tile.column} row=${row} col=${col}`); 
  }

  // update the row/col (rearrange_hand may have changed things)
  if (tile) {
    tile.row = row;
    tile.column = col;
  }
  x = (col - 1) * CELL_SIZE;
  y = (row - 1) * CELL_SIZE;

  // Upto this point all tiles have a PlainDraggable wrapper that uses
  // css' translate. So, the tiles.svg have the original player_hand
  // coordinates and a translate field. In tile_clicked this causes issues
  // with cycling through the player colors because setting the rect color
  // directly doesn't use the css translate. So, fix up the svg coords here.
  svg.setAttributeNS(null, 'transform', "");
  svg.setAttributeNS(null, 'x', x);
  svg.setAttributeNS(null, 'y', y);
  this.position();

  // console.log('tile_moving - tile.row: %d tile.column: %d this.rect.width: %f Scale: %f',
    // tile.row, tile.column, this.rect.width, Scale);
}

function tile_moved(new_position) {
  // 'this' references the PlainDraggable instance
  // Scale = CELL_SIZE / this.rect.width;

  var row = -1;
  var col = -1;
  var letter;

  let svg = this.element;
  let x = svg.getAttributeNS(null, "x");
  let y = svg.getAttributeNS(null, "y");

  let tile = PlayerHand.tiles.find(t => {
    return t && t.svg == svg
  });

  // if the tile wasn't in the PlayerHand, it's in the
  // PlayStarts array.
  if (!tile) {
    tile = PlayStarts.find(t => {
      return t && t.svg == svg
    });
  }

  if (tile) {
    if (AppOrientation == HORIZ) {
      tile.drag.left -= Scale*grid_offset_xy-2*CELL_SIZE;
      new_position.left -= Scale*grid_offset_xy-2*CELL_SIZE;
    }
    else {
      tile.drag.top += Scale*grid_offset_xy+2*CELL_SIZE;
      new_position.top += Scale*grid_offset_xy+2*CELL_SIZE;
    }
    tile.drag.position();

    col = Math.round(x / CELL_SIZE) + 1;
    row = Math.round(y / CELL_SIZE) + 1;
    
    if (!tile.is_collision(row, col)) {
      tile.move(row, col);
    } else {
      // if we get a collision here use the last 'good' r/c
      // console.log(`tile_moved collision: tile.row=${tile.row} tile.col=${tile.column} row=${row} col=${col}`);
      row = tile.row;
      col = tile.column;
    }

    // console.log('finished move at - row: %d column: %d', row, col);

    // if stopped dragging within the player-hand area don't
    // want that PlayStart to hang around
    if (PlayerHand.is_in_hand(x, y)) {

      PlayerHand.rearrange_hand(tile.svg, tile.player_hand_idx);

      // take it out of the PlayStarts
      PlayStarts = PlayStarts.filter(ps => {
        return ps.id != tile.id;
      });
      // console.log("tile_moving - rearranged hand to: " + (col - 17));
    }

    // TODO ugly
    else if (Tile.is_in_trash(row, col)) {
      // console.log("tile to trash ...");
      tile.state |= Tile.trashed;
      PlayerHand.remove(tile);
      PlayTrash.push(tile);
    }
    // on the board
    else if (Tile.is_on_board(row, col)) {
      tile.status |= Tile.on_board;
      PlayerHand.remove(tile);
      if (tile.status & Tile.is_blank &&
          tile.char == BLANK_TILE) {
        letter = window.prompt("Please type the letter to use: ");
        if (letter) {
          while (!char_regex.test(letter)) {
            letter = window.prompt("ONLY A SINGLE CHARACTER a-z or A-Z is acceptable!");
          }
          tile.char = letter.trim().toLowerCase();
          svg.childNodes[TEXT_POSITION].textContent = tile.char;
        }
        // console.log("blank tile moved: " + letter);
      }
    }
    else {
      PlayerHand.rearrange_hand(tile.svg, tile.player_hand_idx);
    }
  }
}

// Only called on a page load
function setup_tiles_for_drag() {
  let tile_svgs = document.querySelectorAll('.player_tile_svg');
  tile_svgs.forEach((item, idx) => {
    item.setAttributeNS(null, "width", CELL_SIZE*2);
    item.setAttributeNS(null, "height", CELL_SIZE*2);
    
    let drag_rec = new PlainDraggable(item);

    drag_rec.onMove = tile_moving;
    drag_rec.onDragEnd = tile_moved;
    drag_rec.onDragStart = tile_move_start;
    drag_rec.autoScroll = true;

    drag_rec.containment = {
      left: 0,
      top: 0,
      // width: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'width'),
      // height: AppSpace.getAttributeNS("http://www.w3.org/2000/svg", 'height')
      width: "100%",
      height: "100%"
    };
    drag_rec.snap = {CELL_SIZE};

    PlayerHand.tiles.push(new Tile(item, drag_rec, idx, Tile.in_hand));
  });

  // now stuff the word tiles into an easily accessable list - for drag control
  Tile.word_tiles = [];
  tile_svgs = document.querySelectorAll('.word_tile_svg');
  tile_svgs.forEach((item, idx) => {
    Tile.word_tiles.push(item);
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
      if (update_scoreboard(item, new_data[i])) {
        ;
      } else if (new_data[i].play_data) {
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

  // update the scoreboard - but first clear the tile
  // image residue
  for (let i = 0; i < new_data.length; i++) {
    let item;
    if (update_scoreboard(item, new_data[i])) {
      ;
    }
  }

  // new tiles
  xchanged_tiles.forEach((item, idx) => {
    setup_tile_for_play(item, false);
  });

}

function handle_pass(resp) {
  // update the scoreboard
  for (let i = 0; i < resp[0].new_data.length; i++) {
    let item;
    if (update_scoreboard(item, resp[0].new_data[i])) {
      ;
    }
  }
}

function toggle_player() {

  let url = window.location.href;
  url.indexOf("player1") > -1 ? URL_x = "/player2" : URL_x = "/player1";

  let game_id = document.getElementById("current_game_id").value;
  let user = document.getElementById("user").value;

  let xhr = new XMLHttpRequest();
  xhr.open("GET", URL_x + "?game=" + game_id + "&user=" + user, true);
  xhr.setRequestHeader("Content-Type", "text/html");

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      document.location.href = URL_x + "?game=" + game_id + "&user=" + user;
    }
  }

  xhr.send(null);

}

function handle_cheat(player, msg) {
  let matches = msg.split('\n');
  Chat.innerHTML += "<br><br><b>" + player + "</b>:<br>";
  for (let i = 0; i<matches.length; i++) {
    let idx = matches[i].indexOf(':');
    Chat.innerHTML += matches[i].slice(-(matches[i].length-idx-1)) + "<br>";
  };
}

function handle_chat(player, msg) {
  Chat.innerHTML += "<br><br><b>" + player + "</b>:<br>" + msg;
}

function handle_game_over(info) {
  let p1_name = info.player1.name;
  let p2_name = info.player2.name;

  // build the game over message
  var p1_msg = "Final Score: " + p1_name + ": ";
  var p2_msg = "Final Score: " + p2_name + ": ";

  var p1_tiles_inhand = [];
  info.player1.remaining_tiles.forEach((item, i) => {
    p1_tiles_inhand.push(item.char + "/" + item.points);
  });
  p1_msg += info.player1.score + '\n' + "Unplayed tiles: \n" +
    p1_tiles_inhand.join(" ");

  var p2_tiles_inhand = [];
  info.player2.remaining_tiles.forEach((item, i) => {
    p2_tiles_inhand.push(item.char + "/" + item.points);
  });
  p2_msg += info.player2.score + '\n' + "Unplayed tiles: \n" + p2_tiles_inhand.join(" ");

  window.alert("GAME OVER!\n\n" + p1_msg + "\n\n" + p2_msg);
}

const HORIZ = 0;
const VERT = 1;

// ALERT!! AppOrientation is only partially completed - horizontal only
AppOrientation = HORIZ;
// if (window.innerWidth < window.innerHeight)
  // AppOrientation = VERT;

AppSpace = document.querySelectorAll('#every_damn_thing')[0];
PlaySpace = document.querySelectorAll('#wt_board')[0];

function changeLayout() {
  var scorebd = document.getElementById("scoreboard_bg");
  var player_pnl = document.getElementById("player_panel");

  draw_board();
}

function getWindowSize() {
  // massage the top viewbox so all of grid displays
  let winWidth = window.innerWidth;
  let winHeight = window.innerHeight;
  let lastOrient = AppOrientation;

  // if the orientation changes, change the layout
  winWidth > winHeight ? AppOrientation = HORIZ : AppOrientation = VERT;

  let vbstr = null;
  let winRatio = winWidth/winHeight;
  if (AppOrientation == HORIZ) {
    vbstr =`0 0 ${Math.max(winRatio*GRID_SIZE, GRID_SIZE+grid_offset_xy+player_panel_wh)} ${GRID_SIZE}`; 
    AppSpace.setAttributeNS(null, "viewBox", vbstr);
    PlaySpace.setAttributeNS(null, "width", GRID_SIZE+player_panel_wh);
    PlaySpace.setAttributeNS(null, "height", GRID_SIZE);
    PlaySpace.setAttributeNS(null, "viewBox", `0 0 ${GRID_SIZE+player_panel_wh} ${GRID_SIZE}`);
  }
  else if (AppOrientation == VERT) {
    let playHeight = grid_offset_xy+player_panel_wh+GRID_SIZE;
    vbstr =`0 0 ${Math.max(GRID_SIZE, winRatio*playHeight)} ${playHeight}`;
    AppSpace.setAttributeNS(null, "viewBox", vbstr);
    PlaySpace.setAttributeNS(null, "width", GRID_SIZE);
    PlaySpace.setAttributeNS(null, "height", GRID_SIZE+player_panel_wh);
    PlaySpace.setAttributeNS(null, "viewBox", `0 0 ${GRID_SIZE} ${GRID_SIZE+player_panel_wh}`);
  }

  if (lastOrient != AppOrientation)
    changeLayout();
  // console.log(`winWidth=${winWidth} winHeight=${winHeight} viewbox=${vbstr}`);
}
window.onresize = getWindowSize;
window.onload = getWindowSize;

// const ws = new WebSocket('ws://drawbridgecreativegames.com:' + ws_port);
const ws = new WebSocket('ws://192.168.0.16:' + ws_port);

function update_current_player(player) {
  // this makes sure 'current_player' is set correctly - needed for
  // inhibiting function of Play, Swap, Pass
  if (player.indexOf("player1") != -1) {
   current_player = "/player2";
  }
  else {
    current_player = "/player1";
  } 
  
  if (current_player == "/player1") {
    let photo_rec = document.getElementById("player1_photo");
    photo_rec.setAttributeNS(null, "stroke", "red");
    photo_rec.setAttributeNS(null, "stroke-width", "3");
    photo_rec = document.getElementById("player2_photo");
    photo_rec.setAttributeNS(null, "stroke-width", "0");
  } else {
    let photo_rec = document.getElementById("player2_photo");
    photo_rec.setAttributeNS(null, "stroke", "red");
    photo_rec.setAttributeNS(null, "stroke-width", "3");
    photo_rec = document.getElementById("player1_photo");
    photo_rec.setAttributeNS(null, "stroke-width", "0");
  }
}

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

  console.log("in onmessage: type = " + type.type);
  console.log("in onmessage: player = " + player.player + " URL = " + URL_x);
  if (info)
    console.log("in onmessage: info = " + info.info);

  if (type.type == "game_over") {
    handle_game_over(info);
  } else if (type.type == "pass") {
    if (player.player != URL_x)
      alert(info.info);
    handle_pass(resp);
    update_current_player(player.player);
  } else if (type.type == "xchange") {
    if (player.player == URL_x) {
      handle_exchange(resp);
      update_current_player(player.player);
    } else {
      // update the scoreboard
      let new_data = resp[0].new_data;
      for (let i = 0; i < new_data.length; i++) {
        let item;
        if (update_scoreboard(item, new_data[i])) {
          ;
        }
      }
      alert(info.info);
    }
  } else if (type.type == "regular_play") {
    if (player.player == URL_x) {
      if (!(err = handle_the_response(resp)))
        update_current_player(player.player);
    }
    else {
      update_the_board(resp);
      if (!resp[0].err_msg)
        update_current_player(player.player);
      if (info.info != "none")
        alert(info.info);
    }
  } else if (type.type == "message") {
    if (player.player != URL_x)
      alert(info.info);
  }
  else if (type.type == "chat") {
    handle_chat(player.player, info.info);
  }
  else if (type.type == "cheat") {
    handle_cheat(player.player, info.info);
  }
  else {
    console.log("in onmessage: no play type");
  }

  // leave a clean environment
  PlayStarts = [];
  PlayTrash = [];

  // in this case a single player is playing both player1 and player2
  if (is_practice != "0" && !err &&
    type.type != "chat" && type.type != "cheat") {
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

function set_button_callbacks() {
  // play recall swap chat
  let btn = document.getElementById('back_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_home_btn);
  }

  btn = document.getElementById('recall_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_recall);
  }

  btn = document.getElementById('play_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_play);
  }

  btn = document.getElementById('pass_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_pass);
  }

  btn = document.getElementById('swap_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_swap_begin);
  }

  btn = document.getElementById('chat_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_chat_btn);
  }
}

set_button_callbacks();
setup_tiles_for_drag();
getWindowSize();
