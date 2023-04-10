/*
   Copyright 2021 Richard Vassilaros 
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
var tile_points_offX = parseInt(document.getElementById("tile_points_offX").value);
var tile_points_offY = parseInt(document.getElementById("tile_points_offY").value);

var current_player = document.getElementById("current_player").value;

var ws_port = document.getElementById("ws_port").value;

var URL_x = null;
var AppSpace = null;
var Scale = 1.0;

var ChatWin = null;
var ChatDoc = null;
var Chat = null;
var chat_width = 300;
var chat_height = 600;

var BookMKWin = null;
var BookMKDoc = null;
var BookMK = null;
var BookMK_width = 300;
var BookMK_height = 600;

const NUM_ROWS_COLS = 15;
const CELL_SIZE = 35;
const GRID_SIZE = CELL_SIZE*NUM_ROWS_COLS;

const SAFETY_FILL = 'rgba(68,187,85,1)';
const SAFETY_FILL_LITE = 'rgba(68,187,85,.3)';

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
const TEXT_POSITION = 6;
const POINTS_POSITION = 7;
const BLANK_TILE = "WILD";
const char_regex = /^([a-r]|[t-z]){1}$|^([A-R]|[T-Z]){1}$/;
// const char_regex = /^[a-z]{1}$|^[A-Z]{1}$/;
const back_ground = "#f5efe6ff";
var scoreboard = null;

class Tile {
  constructor(svg, drag, idx, status, points) {

    this.id = svg.getAttributeNS(null, "id");
    this.char = svg.childNodes[TEXT_POSITION].textContent;
    this.points = points ? points : parseInt(svg.childNodes[POINTS_POSITION].textContent);
    this.row = Math.round(svg.getAttributeNS(null, "y") / CELL_SIZE) + 1;
    this.column = Math.round(svg.getAttributeNS(null, "x") / CELL_SIZE) + 1;
    this.player_hand_idx = idx;
    this.svg = svg;
    this.drag = drag;

    this.status = status;
    if (this.char == BLANK_TILE) this.status |= Tile.is_blank;
  }

  static get_Tile_json() {
    // let  ret_val = [];
    // let wt = [];
    // Tile.word_tiles.forEach(t => {
      // wt.push(t.get_JSON());
    // });
    let st = [];
    Tile.swapped_tiles.forEach(t => {
      if (t)
        st.push(t.get_JSON());
    })
    // ret_val.push({"word tiles" : wt});
    // ret_val.push({"swapped_tiles" : st});
    return st;
  }

  get_JSON() {
    return {
      id: this.id,
      char: this.char,
      x: this.svg.getAttributeNS(null, "x"),
      y: this.svg.getAttributeNS(null, "y"),
      row: this.row,
      col: this.column,
      points: this.points,
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
      // never clear the in_hand status
      // if (this.status & Tile.in_hand) this.status ^= Tile.in_hand;
      PlayerHand.remove(this);
    } else if (PlayerHand.is_in_hand(x, y)) {
      if (this.status & Tile.on_board) this.status ^= Tile.on_board;
      if (!PlayerHand.add(this)) {
        console.log(`Cannot add tile ${this.char}/${this.id} to PlayerHand - tile may be dropped!`);
      }
    } 
  }

  is_collision(row,col) {
    // console.log(`Tile.is_collision: row/col: ${row}/${col}`);

    // check against all played tiles
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
      else if ((AppOrientation == HORIZ && (col < 1 || row > 15 )) ||
                (AppOrientation == VERT && (col > 15 || row < 1))) {
        console.log(`Tile.is_collision: collided with edge row/col: ${row}/${col}`);
        return true;
      }
    }

    return false;
  }

  static word_tiles = [];
  static swapped_tiles = [];

  // these are the legitimate tile states
  // they MUST match tile.js Tile.<stuff>
  static none = 0;
  static in_hand = 1; 
  static on_board = 2;
  static is_blank = 8;
  static utilized = 32;

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

  static get_PlayerHand_json() {
    let phts = [];
    PlayerHand.tiles.forEach(t => {
      if (t)
        phts.push(t.get_JSON());
    });
    return phts;
  }

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

    // want to accommodate tiles moved from the board, also
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
    // Once the tile comes out of the tile pool it should never revert to
    // a '0' status. So, allow clearing of on_board and utilized but never
    // in_hand (except on exchange and that is handled server side)
    // if (tile.status & Tile.in_hand) tile.status = tile.status ^ Tile.in_hand;

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

var PlayStarts = [];
function get_PlayStarts_JSON() {
  let ret_val = [];
  PlayStarts.forEach(t => {
    if (t)
      ret_val.push(t.get_JSON());
  });
  return ret_val;
}

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
      if (id_prefix == "tile_")
        svg.addEventListener("click", tile_clicked);
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
    r.setAttributeNS(null, 'width', CELL_SIZE - 1);
    r.setAttributeNS(null, 'height', CELL_SIZE - 1);
    r.setAttributeNS(null, 'fill', tile.fill);
    // r.setAttributeNS(null, 'stroke_width', 1);
    r.setAttributeNS(null, 'stroke', '#000');
    r.setAttributeNS(null, 'class', 'tile_rect');
    svg.append(r);

    // hilites
    let l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttributeNS(null, 'x1', 1);
    l.setAttributeNS(null, 'y1', 1);
    l.setAttributeNS(null, 'x2', CELL_SIZE-1);
    l.setAttributeNS(null, 'y2', 1);
    l.setAttributeNS(null, 'stroke_width', 1);
    l.setAttributeNS(null, 'stroke', 'white');
    l.setAttributeNS(null, 'stroke-opacity', .4);
    l.setAttributeNS(null, 'class', 'hilite_top_left');
    svg.append(l);
    l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttributeNS(null, 'x1', 1);
    l.setAttributeNS(null, 'y1', 1);
    l.setAttributeNS(null, 'x2', 1);
    l.setAttributeNS(null, 'y2', CELL_SIZE-2);
    l.setAttributeNS(null, 'stroke_width', 1);
    l.setAttributeNS(null, 'stroke', 'white');
    l.setAttributeNS(null, 'stroke-opacity', .4);
    l.setAttributeNS(null, 'class', 'hilite_top_left');
    svg.append(l);
    l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttributeNS(null, 'x1', CELL_SIZE-2);
    l.setAttributeNS(null, 'y1', 1);
    l.setAttributeNS(null, 'x2', CELL_SIZE-2);
    l.setAttributeNS(null, 'y2', CELL_SIZE-2);
    l.setAttributeNS(null, 'stroke_width', 1);
    l.setAttributeNS(null, 'stroke', 'black');
    l.setAttributeNS(null, 'stroke-opacity', .4);
    l.setAttributeNS(null, 'class', 'hilite_bottom_right');
    svg.append(l);
    l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttributeNS(null, 'x1', 1);
    l.setAttributeNS(null, 'y1', CELL_SIZE-2);
    l.setAttributeNS(null, 'x2', CELL_SIZE-2);
    l.setAttributeNS(null, 'y2', CELL_SIZE-2);
    l.setAttributeNS(null, 'stroke_width', 1);
    l.setAttributeNS(null, 'stroke', 'black');
    l.setAttributeNS(null, 'stroke-opacity', .4);
    l.setAttributeNS(null, 'class', 'hilite_bottom_right');
    svg.append(l);

    let pg = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    pg.setAttributeNS(null, "points", "3,3 15,3 3,15");
    pg.setAttributeNS(null, 'fill',  "black");
    // this do-nothing poly is to keep indexing in board.js consistant
    if (!(tile.status & Tile.is_blank))
      pg.setAttributeNS(null, 'fill-opacity',  "0");
    svg.append(pg);

    let t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttributeNS(null, 'x', CELL_SIZE / 2);
    t.setAttributeNS(null, 'y', CELL_SIZE / 2);
    t.setAttributeNS(null, 'width', CELL_SIZE-2);
    t.setAttributeNS(null, 'height', CELL_SIZE-2);
    t.setAttributeNS(null, 'stroke_width', 2);
    t.setAttributeNS(null, 'stroke', '#000');
    t.setAttributeNS(null, 'fill', '#000');
    t.setAttributeNS(null, 'text-anchor', "middle");
    t.setAttributeNS(null, 'alignment-baseline', "central");
    t.setAttributeNS(null, 'class', 'tile_text');
    if (tile.char == BLANK_TILE)
      t.classList.add('wild_tile');
    // t.addEventListener("click", tile_clicked);
    t.textContent = tile.char;
    svg.append(t);

    let p = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    p.setAttributeNS(null, 'x', CELL_SIZE - tile_points_offX);
    p.setAttributeNS(null, 'y', CELL_SIZE - tile_points_offY);
    // p.setAttributeNS(null, 'style', { font: "italic 8px sans-serif" });
    p.setAttributeNS(null, 'width', CELL_SIZE*.2);
    p.setAttributeNS(null, 'height', CELL_SIZE*.2);
    p.setAttributeNS(null, 'stroke_width', 1);
    p.setAttributeNS(null, 'stroke', '#000');
    t.setAttributeNS(null, 'fill', '#000');
    p.setAttributeNS(null, 'text-anchor', "end");
    p.setAttributeNS(null, 'alignment-baseline', "central");
    p.setAttributeNS(null, 'class', 'tile_points');
    p.textContent = tile.points;
    svg.append(p);
  }

// these are NEW tiles created async during play
function setup_jtile_for_play(tile_json, no_drag) {
  let idx = -1;

  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (svg) {
    if (!no_drag) {
      idx = PlayerHand.get_open_slot();
      svg.setAttributeNS(null, 'class', 'player_tile_svg');
    }

    build_sub_struct(tile_json, idx, svg);

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
      } 

      let status = Tile.in_hand;
      if (tile_json.status & Tile.is_blank) status |= Tile.is_blank;

      drag_rec.snap = {CELL_SIZE};
      PlayerHand.tiles[idx] = new Tile(svg, drag_rec, idx, status, tile_json.points);
    }
    else Tile.word_tiles.push(svg);
  }

  // console.log("in setup_jtile_for_play: ", PlayerHand.tiles[idx]);
  return svg;
}

function set_jtile_props(jtile) {
  let svg = document.getElementById("tile_" + jtile.id);
  if (svg) {
    let r = svg.childNodes[RECT_POSITION];
    r.setAttributeNS(null, 'fill', jtile.fill);
    svg.classList.remove('player_tile_svg');
  } else {
    svg = setup_jtile_for_play(jtile, true);
  }
}

function get_played_JSONS() {
  let check_jsons = [];
  let tile_svgs = document.querySelectorAll('.player_tile_svg');

  let jsons = [];
  PlayStarts.forEach((item, i) => {
    jsons.push(item.get_JSON());
  });

  return jsons;
}

function handle_err_response(resp) {
  let err_msg = resp[0].err_msg;
  alert(err_msg);

  // out per video 20220814
  // clicked_recall();
}

function update_played_s_count(played_s_count) {
  let items = document.querySelectorAll(".s_count");
  for (let i=0; i< played_s_count; i++) {
    items[i].setAttributeNS(null, "stroke", "white");
  }
}

function update_scoreboard(item, data) {
  let ret_val = true;
  if (data.scoreboard_player_1_name) {
    item = document.getElementById("player1_name");
    if (item) item.textContent = data.scoreboard_player_1_name;
  }
  else if (data.scoreboard_player_1_score !== undefined) {
    item = document.getElementById("player1_score");
    if (item) item.textContent = data.scoreboard_player_1_score;
  } 
  else if (data.scoreboard_player_1_safe_score !== undefined) {
    item = document.getElementById("player1_lock_pts");
    if (item) item.textContent = data.scoreboard_player_1_safe_score;
  } 
  else if (data.scoreboard_player_2_name) {
    item = document.getElementById("player2_name");
    if (item) item.textContent = data.scoreboard_player_2_name;
  } 
  else if (data.scoreboard_player_2_score !== undefined) {
    item = document.getElementById("player2_score");
    if (item) item.textContent = data.scoreboard_player_2_score;
  } 
  else if (data.scoreboard_player_2_safe_score !== undefined) {
    item = document.getElementById("player2_lock_pts");
    if (item) item.textContent = data.scoreboard_player_2_safe_score;
  } 
  else if (data.tiles_left_value >= 0) {
    item = document.getElementById("tiles_left_count");
    if (item) item.textContent = data.tiles_left_value;
  } 
  else if (data.tiles_left_value >= 0) {
    item = document.getElementById("tiles_left_count");
    if (item) item.textContent = data.tiles_left_value;
  } 
  else if (data.scoreboard_played_s_count > 0) {
    update_played_s_count(data.scoreboard_played_s_count);
  } 
  else
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
        tile.svg.childNodes[RECT_POSITION].setAttributeNS(null, "fill", word_tiles[i].fill);
        // finally, stuff it in the Tile.word_tiles for collision control
        tile.svg.addEventListener("click", tile_clicked);
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
          set_jtile_props(item);
        });
      }
      // new tiles
      else if (new_data[i].new_tiles) {
        new_data[i].new_tiles.forEach((item, idx) => {
          setup_jtile_for_play(item, false);
        });
      }
    }
    return has_error;
  }

  if (!has_error) {
    // now stuff the word tiles into an easily accessable list - for drag control
    Tile.word_tiles = [];
    tile_svgs = document.querySelectorAll('.word_tile_svg');
    tile_svgs.forEach((item, idx) => {
      Tile.word_tiles.push(item);
    });

    PlayStarts = [];
  }
  return has_error;
}

var LastWordHilite = false;
var HiliteWords = [];
function clicked_hilite_last_word(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  // if already hiliteing the last word, clear the hilite and return
  if (LastWordHilite) {
    HiliteWords.forEach(svg => {
      if (svg) unhilite_tile(svg);
    });
    HiliteWords = [];
    LastWordHilite = false;
    return;
  }

  let jsons = [];
  jsons.unshift({
    "player": URL_x
  });
  jsons.unshift({
    "type": "last_played_word"
  });

  ws.send(JSON.stringify(jsons));
}

var ZoomOnTileDrag = false;
function clicked_toggle_zoom(event) {
  ZoomOnTileDrag ? ZoomOnTileDrag = false : ZoomOnTileDrag = true;
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

  if (jsons.length > 1)
    ws.send(JSON.stringify(jsons));
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
    tile.svg.childNodes[RECT_POSITION].setAttributeNS(null, "fill", "white");
    tile.svg.childNodes[TEXT_POSITION].setAttributeNS(null, "stroke", "white");
    tile.svg.childNodes[POINTS_POSITION].setAttributeNS(null, "stroke", "white");
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
        item.svg.childNodes[TEXT_POSITION].textContent = "WILD";
        item.svg.childNodes[TEXT_POSITION].setAttributeNS(null, "font-size", "100%");
        item.char = "WILD"
        item.svg.childNodes[TEXT_POSITION].classList.add('wild_tile');
        item.svg.childNodes[TEXT_POSITION].classList.remove('tile_text');
      }
      if (!PlayerHand.add(item))
        console.log(`clicked_recall: cannot add ${item.char}/${item.id} to PlayerHand`);
    });
  }
  PlayStarts = [];
}

function swap_toggle_highlight(svg, no_toggle) {
  var tile_id = svg.getAttributeNS(null, "id");
  let found_id = Tile.swapped_tiles.find(item => {
    return item == tile_id;
  })
  if (!found_id) { // select it
    Tile.swapped_tiles.push(svg.getAttributeNS(null, "id"));
    let hilite = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hilite.setAttributeNS(null, "x", 2);
    hilite.setAttributeNS(null, "y", 2);
    hilite.setAttributeNS(null, "width", CELL_SIZE - 4);
    hilite.setAttributeNS(null, "height", CELL_SIZE - 4);
    hilite.setAttributeNS(null, "stroke", "red");
    hilite.setAttributeNS(null, "stroke-width", "3");
    svg.appendChild(hilite);
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
};

function clicked_swap_cancel(event) {
  let pu = document.getElementById("swap_pop");
  pu.style.display = "none";
  // clear the pu elements
  while (pu.firstChild) {
   pu.removeChild(pu.firstChild)
  }

  Tile.swapped_tiles = [];
  window.onclick = null;
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

  let tiles_left = parseInt(document.getElementById("tiles_left_count").textContent);
  if (tiles_left < 11) {
    alert("Tile swaps are limited to tile pool sizes of 10 or more - no swap!");
    return;
  }

  let pu = document.getElementById("swap_pop");

  // don't allow multiple displays of PlayerHand
  if (pu.firstChild) {
    alert("Swap is already up! Cancel, Select All or Swap to continue.")
    return;
  }

  let svg = null;
  let fill = "#000"
  let new_idx = -1;
  PlayerHand.tiles.forEach((t, idx) => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (svg) {
      t.fill = t.svg.childNodes[RECT_POSITION].getAttributeNS(null, "fill");
      fill = t.fill;
      build_sub_struct(t, idx, svg, "swap_");
      pu.appendChild(svg); 
      new_idx = idx;
    } 
  });

  // now the controls
  var sel = document.createElement("BUTTON"); 
  sel.id = "swap_sel_all";
  sel.textContent = "Select All";
  sel.width = CELL_SIZE*2;
  sel.height = CELL_SIZE;
  sel.onclick = swap_select_all;
  pu.appendChild(sel);

  var swap = document.createElement("BUTTON"); 
  swap.id = "swap_now";
  swap.textContent = "Swap";
  swap.width = CELL_SIZE*2;
  swap.height = CELL_SIZE;
  swap.onclick = clicked_swap_end;
  pu.appendChild(swap);

  var cancel = document.createElement("BUTTON"); 
  cancel.id = "swap_cancel";
  cancel.textContent = "Cancel";
  cancel.width = CELL_SIZE*2;
  cancel.height = CELL_SIZE;
  cancel.onclick = clicked_swap_cancel;
  pu.appendChild(cancel);

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
}

function clicked_tail_log_btn() {
  var logf_name = ChatDoc.getElementById("log_name").value;
  var user = document.getElementById("user").value;
  if (user) {
    let msg = [];
    msg.push({"type" : "tail_log"});
    msg.push({"player" : user});
    msg.push({"info" : logf_name});
    ws.send(JSON.stringify(msg));
  }
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

function clicked_peek_board_btn() {
  let jsons = [];
  jsons.push({"Tile" : Tile.get_Tile_json()});
  jsons.push({"PlayerHand" : PlayerHand.get_PlayerHand_json()});
  jsons.push({"PlayStarts" : get_PlayStarts_JSON()});
  var container = ChatDoc.getElementById("chat_text");
  var tree = jsonTree.create(jsons, container);
}

function clicked_chat_btn() {
  // if it's already up ...
  if (ChatWin) return;

  let sl = window.screenLeft > chat_width ? window.screenLeft - chat_width : window.outerWidth;
  ChatWin = window.open("", "Chat", `width=${chat_width},height=${chat_height},popup,left=${sl}`); 
  ChatWin.addEventListener('unload', event => {
    // called on interactive 'X'
    ChatWin = null;
   });
  ChatDoc = ChatWin.document;

  let dv = ChatDoc.createElement("div");
  dv.id = "chat_text";
  dv.height = "80%";
  dv.width = "100%";

  let ctrls = ChatDoc.createElement("div");
  ctrls.id = "ctrls";
  ctrls.height = "20%";
  ctrls.width = "100%";
  // pu.style.display = "none";

  let p = ChatDoc.createElement("p");
  p.id="chat_para"; 
  p.x = "0";
  p.y = "0";
  p.height = "260";
  p.width = "100%";
  p.textContent = "<b>Salutations Worderists!</b>";
  dv.appendChild(p);
  
  let ta = ChatDoc.createElement("textarea");
  ta.id = "chat_send_text";
  ta.x = "0";
  ta.y = "80%";
  ta.rows = "2";
  ta.cols = "30";
  ta.wrap = "hard";
  ta.placeholder = "Type here ...";
  ctrls.appendChild(ta);

  let sb = ChatDoc.createElement("input");
  sb.id = "chat_send_btn";
  sb.type = "button";
  sb.class="button";
  sb.value = "Send";
  sb.height="30";
  sb.width = "50";
  sb.onclick = clicked_chat_send_btn;
  ctrls.appendChild(sb);

  if (is_admin == "true") {
    ta = document.createElement("textarea"); 
    ta.id = "cheat_text";
    ta.rows = "2"
    ta.cols = "30";
    ta.wrap = "soft";
    ta.placeholder = "Cheat here ...";
    ctrls.appendChild(ta);

    sb = ChatDoc.createElement("input");
    sb.id = "cheat_send_btn";
    sb.type = "button";
    sb.class="button";
    sb.value = "Send";
    sb.height="30";
    sb.width = "50";
    sb.onclick = clicked_cheat_send_btn;
    ctrls.appendChild(sb);
    
    sb = ChatDoc.createElement("input");
    sb.id = "peek_board_btn";
    sb.type = "button";
    sb.class="button";
    sb.value = "Peek";
    sb.height="30";
    sb.width = "50";
    sb.onclick = clicked_peek_board_btn;
    ctrls.appendChild(sb);

    ta = document.createElement("textarea"); 
    ta.id = "log_name";
    ta.rows = "1"
    ta.cols = "30";
    ta.wrap = "soft";
    ta.placeholder = "tail-file path/name ...";
    ctrls.appendChild(ta);
    
    sb = ChatDoc.createElement("input");
    sb.id = "tail_log_btn";
    sb.type = "button";
    sb.class="button";
    sb.value = "Send"
    sb.height="30";
    sb.width = "50";
    sb.onclick = clicked_tail_log_btn;
    ctrls.appendChild(sb);
  }

  ChatDoc.body.appendChild(dv);
  ChatDoc.body.appendChild(ctrls);

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

  if (ChatWin) { ChatWin.close(); ChatWin = null; }

  console.log("clicked_home_btn port: " + ws_port);
  xhr.send(null);
}

function clicked_question(event) {
  alert(`Nothing to see here. Move along.`)
}

function clicked_bookmark_log(event) {
  if (BookMKWin) return;

  let sl = window.screenLeft > BookMK_width ? window.screenLeft - BookMK_width : window.outerWidth;
  BookMKWin = window.open("", "Bookmark Log", `width=${BookMK_width},height=${BookMK_height},popup,left=${sl}`); 
  BookMKWin.addEventListener('unload', event => {
    // called on interactive 'X'
    BookMKWin = null;
   });
  BookMKDoc = BookMKWin.document;

  let dv = BookMKDoc.createElement("div");
  dv.id = "bookmk_text";
  dv.height = "80%";
  dv.width = "100%";

  let ctrls = BookMKDoc.createElement("div");
  ctrls.id = "ctrls";
  ctrls.height = "20%";
  ctrls.width = "100%";
  // pu.style.display = "none";

  let p = BookMKDoc.createElement("p");
  p.id="bookmk_para"; 
  p.x = "0";
  p.y = "0";
  p.height = "260";
  p.width = "100%";
  p.textContent = "Enter as much info about this heinous event as you can - words played, tiles which should be somewhere else, etc."
  dv.appendChild(p);
  
  let ta = BookMKDoc.createElement("textarea");
  ta.id = "bookmk_send_text";
  ta.x = "0";
  ta.y = "80%";
  ta.rows = "10";
  ta.cols = "30";
  ta.wrap = "hard";
  ta.placeholder = "Complain here ...";
  ctrls.appendChild(ta);

  let sb = BookMKDoc.createElement("input");
  sb.id = "bookmk_send_btn";
  sb.type = "button";
  sb.class="button";
  sb.value = "Send";
  sb.height="30";
  sb.width = "50";
  sb.onclick = clicked_bookmk_send_btn;
  ctrls.appendChild(sb);

  BookMKDoc.body.appendChild(dv);
  BookMKDoc.body.appendChild(ctrls);

  BookMK = BookMKDoc.getElementById("bookmk_para");
}

function clicked_bookmk_send_btn(event) {
  let txt = BookMKDoc.getElementById("bookmk_send_text");
  var user = document.getElementById("user").value;
  if (txt && user) {
    let msg = [];
    msg.push({"type" : "bookmark_log"});
    msg.push({"player" : user});
    msg.push({"info" : txt.value});
    txt.value = "";

    ws.send(JSON.stringify(msg));

    if (BookMKWin) { BookMKWin.close(); BookMKWin = null; }
  }
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

var FullVertVB = `0 0 ${GRID_SIZE} ${GRID_SIZE+player_panel_wh}`; 
var ViewStack = [FullVertVB];
const vb_wide = 9*CELL_SIZE;
const vb_heigh =  vb_wide*(GRID_SIZE+player_panel_wh)/GRID_SIZE;

function magnify_view(tile, x, y) {
  let x_from, y_from, x_to, y_to = 0;
  let vals = null;

  if (ViewStack.length > 1) {
    vals = ViewStack[ViewStack.length - 1].split(" ");
    x_from = parseInt(vals[0]);
    y_from = parseInt(vals[1]);
  } else {
    // set bounds on x_from, y_from
    x_from =  Math.max(x - vb_wide/2, 0);
    x_from = Math.min(x_from, GRID_SIZE - vb_wide);
    y_from = Math.max(y - vb_heigh/2, 0);
    y_from = Math.min(y_from, GRID_SIZE + player_panel_wh - vb_heigh - CELL_SIZE);
  }

  x_to = x_from + vb_wide;
  y_to = y_from + vb_heigh;

  if (x_to < GRID_SIZE && x > x_to - 2*CELL_SIZE)
    x_from += 10;
  else if (y_to < GRID_SIZE+player_panel_wh && y > y_to - 2*CELL_SIZE)
    y_from += 10;
  else if (x_from > 0 && x < x_from + 2*CELL_SIZE) 
    x_from -= 10;
  else if (y_from > 0 && y < y_from + 2*CELL_SIZE)
    y_from -= 10;

  let vbstr = `${x_from} ${y_from} ${vb_wide} ${vb_heigh}`;
  console.log(`magnify_view x/y: ${x}/${y} vbstr - ${vbstr}`);

  // if the vb has been modified ...
  if (vbstr != ViewStack[length - 1]) {
    // otherwise, if we're already zooming pop the stack and push the new view
    if (ViewStack.length > 1)
      ViewStack.pop();
    ViewStack.push(vbstr);
    PlaySpace.setAttributeNS(null, "viewBox", vbstr);
    tile.drag.position();
  }
}

function reset_view(tile) {
  if (ViewStack.length > 1)
    ViewStack.pop();
  let zoom_to = ViewStack[0]
  PlaySpace.setAttributeNS(null, "viewBox", zoom_to);
  tile.drag.position();
}

function tile_clicked(event) {
  if (!URL_x) {
    let url = window.location.href;
    url.indexOf("player1") > -1 ? URL_x = "/player1" : URL_x = "/player2";
  }

  let id_ary = this.id.split("_");
  let id = parseInt(id_ary[1]);

  let jsons = [];
  jsons.push({ "type": "dictionary_lookup"});
  jsons.push({"player": URL_x});
  jsons.push({"info": id});

  ws.send(JSON.stringify(jsons));
}

function tile_move_start(new_position) {
  let svg = this.element;

  let tile = PlayStarts.find(t => {
    return t && t.svg == svg;
  });

  // if not already in PlayStarts find it and push it
  if (!tile) {
    tile = PlayerHand.tiles.find(t => {
        return t && t.svg == svg;
    });
    if (tile) PlayStarts.push(tile);
  }

    // console.log("tile_move_start: ", tile.get_JSON());
}

function tile_moving(new_position) {
  // note that there are +1 and -1 conversions on row/col - this is due to
  // using 0-based coordinate system for x/y and 1-based coord system
  // for row/col

  // just initing ...
  let row = -1;
  let col = -1;

  let svg = this.element;

  let playXY = screenToSVG(PlaySpace, new_position.left, new_position.top);
  console.log(`tile_moving 2screen: ${playXY.x},${playXY.y}`);

  // odd - during the move these coords are reversed
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

  if (AppOrientation == VERT && ZoomOnTileDrag)
    magnify_view(tile, x, y);

  if (PlayerHand.is_in_hand(x, y)) {
    // console.log(`tile_moving - tile in_hand xy: ${x}/${y}`);
    PlayerHand.rearrange_hand(svg, tile.player_hand_idx);
  } 
  // if we're moving off the board (except for the player-hand area)
  else if (tile && tile.is_collision(row, col)) {
      row = tile.row;
      col = tile.column;
  } 
  else if (Tile.is_on_board(row, col)) {
    // console.log(`tile_moving - tile on board rc : ${row}/${col}`);
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
  // coordinates and a translate field. 
  svg.setAttributeNS(null, 'transform', "");
  svg.setAttributeNS(null, 'x', x);
  svg.setAttributeNS(null, 'y', y);
  this.position();

  // console.log('tile_moving - tile.row: %d tile.column: %d this.rect.width: %f Scale: %f',
    // tile.row, tile.column, this.rect.width, Scale);
}

function tile_moved(new_position) {
  // 'this' references the PlainDraggable instance

  var row = -1;
  var col = -1;
  var letter;

  let svg = this.element;
  let x = svg.getAttributeNS(null, "x");
  let y = svg.getAttributeNS(null, "y");

  let tile = PlayerHand.tiles.find(t => {
    return t && t.svg == svg
  });

  if (AppOrientation == VERT && ZoomOnTileDrag)
    reset_view(tile);

  // if the tile wasn't in the PlayerHand, it's in the
  // PlayStarts array.
  if (!tile) {
    tile = PlayStarts.find(t => {
      return t && t.svg == svg
    });
  }

  if (tile) {
    if (AppOrientation == HORIZ) {
      tile.drag.left -= grid_offset_xy-2*CELL_SIZE;
      new_position.left -= grid_offset_xy-2*CELL_SIZE;
    }
    else {
      tile.drag.top += grid_offset_xy+2*CELL_SIZE;
      new_position.top += grid_offset_xy+2*CELL_SIZE;
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
    // on the board
    else if (Tile.is_on_board(row, col)) {
      tile.status |= Tile.on_board;
      PlayerHand.remove(tile);
      if (tile.status & Tile.is_blank &&
          tile.char == BLANK_TILE) {
        letter = window.prompt("Please type the letter to use: ");
        if (letter) {
          while (!char_regex.test(letter)) {
            letter = window.prompt("A SINGLE CHARACTER a-z or A-Z - EXCEPT S- is acceptable! " + 
              "OR - " + "\nA SINGLE CHARACHTER a/A-r/R or t/T - z/Z. NO s/S");
          }
          tile.char = letter.trim().toUpperCase();
          svg.childNodes[TEXT_POSITION].textContent = tile.char;
          svg.childNodes[TEXT_POSITION].setAttributeNS(null, "font-size", "100%");
          svg.childNodes[TEXT_POSITION].classList.remove('wild_tile');
          svg.childNodes[TEXT_POSITION].classList.add('tile_text');
        }
        // console.log("blank tile moved: " + letter);
      }
    }
    else {
      PlayerHand.rearrange_hand(tile.svg, tile.player_hand_idx);
    }
  }
}

// Only called on a page load for PlayerHand tiles
function setup_svgtiles_for_drag() {
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
      width: "100%",
      height: "100%"
    };
    drag_rec.snap = {CELL_SIZE};

    PlayerHand.tiles.push(new Tile(item, drag_rec, idx, Tile.in_hand));
  });

  // now stuff the word svgs into an easily accessable list - for drag control
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
          set_jtile_props(item);
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
    setup_jtile_for_play(item, false);
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

  if (ChatWin) { ChatWin.close(); ChatWin = null; }

  xhr.send(null);

}

function hilite_tile(svg) {
  if (svg) {
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "x", 2);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "y", 2);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "width", CELL_SIZE - 4);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "height", CELL_SIZE - 4);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "stroke", "white");
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "stroke-width", "3");
  }
}

function unhilite_tile(svg) {
  if (svg) {
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "x", 0);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "y", 0);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "width", CELL_SIZE);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "height", CELL_SIZE);
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "stroke", "black");
    svg.childNodes[RECT_POSITION].setAttributeNS(null, "stroke-width", "1");
  }
}

function handle_dictionary_lookup(defs) {
  // defs has a specific form:
  // defs[0] {word : <firstWord>}
  // defs[1] {definitions: <array>}
  // defs[1].definitions[0] {partOfSpeech : <pos>}
  // defs[1].definitions[1] {definitions : <array>}
  // defs[1].definitions[2] {partOfSpeech : <pos>}
  // defs[1].definitions[3] {definitions : <array>}
  // and so on for each part of speech
  // Then repeating at defs[2] if there is a second word
  // Note: there can be only 2 words at max: 1 vertical, 1 horizontal

  let word;
  let msg = "";
  for (let i= 0; i<defs.length; i++) {
    if (defs[i].word) word = defs[i].word;
    else if (defs[i].definitions) { 
      for (let j=0; j<defs[i].definitions.length; j++) {
        if (defs[i].definitions[j].partOfSpeech) 
          msg += `${word} : ${defs[i].definitions[j].partOfSpeech}\n`;
        else if (defs[i].definitions[j].definitions)
          defs[i].definitions[j].definitions.forEach((def, idx) => {
            msg += `${idx+1}: ${def}\n`;
          });
        }
      }
    }
  msg += "\nDefinitions courtesy of Free Dictionary API";
  alert(msg);
}

function handle_last_played_word(player, tiles) {
  LastWordHilite = true;
  let svg = null;
  tiles.forEach(t => {
    svg = Tile.word_tiles.find(wt => {
      return wt.id == "tile_" + t.id;
    });
    if (svg) {
      hilite_tile(svg);
      HiliteWords.push(svg);
    }
  });
}

function handle_tail_log(player, msg) {
  let matches = msg.split('\n');
  Chat.innerHTML += "<br><b>" + player + "</b>:<br>";
  for (let i = 0; i<matches.length; i++) {
    Chat.innerHTML += matches[i] + " <br>";
  };
}

function handle_cheat(player, msg) {
  let matches = msg.split('\n');
  Chat.innerHTML += "<br><b>" + player + "</b>:<br>";
  for (let i = 0; i<matches.length; i++) {
    let idx = matches[i].indexOf(':');
    Chat.innerHTML += matches[i].slice(-(matches[i].length-idx-1)) + "<br>";
  };
}

function handle_chat(player, msg) {
  Chat.innerHTML += "<br><b>" + player + "</b>:<br>" + msg;
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

AppOrientation = VERT;

AppSpace = document.querySelectorAll('#every_damn_thing')[0];
PlaySpace = document.querySelectorAll('#wt_board')[0];

//const ws = new WebSocket('ws://letsquibble.net:' + ws_port);
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

  // console.log("in onmessage: type = " + type.type);
  // console.log("in onmessage: player = " + player.player + " URL = " + URL_x);
  // if (info)
    // console.log("in onmessage: info = " + info.info);

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
        if (update_scoreboard(item, new_data[i])) { ; }
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
  else if (type.type == "tail_log") {
    handle_tail_log(player.player, info.info);
  }
  else if (type.type == "last_played_word") {
    if (player.player == URL_x)
      handle_last_played_word(player.player, info.tiles);
  }
  else if (type.type == "dictionary_lookup") {
    if (player.player == URL_x)
      handle_dictionary_lookup(resp);
  }
  else {
    console.log("in onmessage: no play type");
  }

  // leave a clean environment (unless there is an error - if so leave tiles on board)
  if (!err)
    PlayStarts = [];

  // in this case a single player is playing both player1 and player2
  if (is_practice != "0" && !err &&
    type.type != "chat" && type.type != "cheat" && type.type != "tail_log" &&
    type.type != "last_played_word" && type.type != "dictionary_lookup") {
    toggle_player();
  }
}

ws.onopen = function() {
  // ws.send("daddy's HOOOME!!");
};
ws.onerror = function(msg) {
  console.error("in get socket: error " + msg);
};
ws.onclose = function(msg) {
  console.log("in get socket: close " + msg);
};

function set_button_callbacks() {
  let btn = document.getElementById('back_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_home_btn);
  }

  btn = document.getElementById('question_click');
  if (btn) {
    btn.addEventListener("click", clicked_question);
  }

  btn = document.getElementById('player2_photo');
  if (btn) {
    btn.addEventListener("click", clicked_toggle_zoom);
  }

  btn = document.getElementById('last_played_on_click');
  if (btn) {
    btn.addEventListener("click", clicked_hilite_last_word);
  }

  btn = document.getElementById('bookmark_log');
  if (btn) {
    btn.addEventListener("click", clicked_bookmark_log);
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

  btn = document.getElementById('player1_photo');
  if (btn) {
    btn.addEventListener("click", clicked_chat_btn);
  }
}

function set_word_tile_click() {
  var tilehooks = document.querySelectorAll('.tilehook');
  tilehooks.forEach(th => {
    th.addEventListener("click", tile_clicked);
  });
}

set_button_callbacks();
set_word_tile_click();
setup_svgtiles_for_drag();