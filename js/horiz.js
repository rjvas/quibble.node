function reposition_played_tiles() {
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
function reposition_safe_squares() {
  var safe_squares = document.querySelectorAll('.safety_square');
  let ss = null;

  for (let i = 0; i < SAFE_INDEXES.length; i++) {
    ss = safe_squares[i];
    ss.setAttributeNS(null, 'x', (SAFE_INDEXES[i].row - 1) * CELL_SIZE + 1);
    ss.setAttributeNS(null, 'y', (SAFE_INDEXES[i].col - 1) * CELL_SIZE + 1);
  }
}

// only on an AppOrientation change
function reposition_center_start() {
  var center_start = document.querySelector('.center_square');
  let x = center_start.getAttributeNS(null, 'x');
  let y = center_start.getAttributeNS(null, 'y');
  center_start.setAttributeNS(null, 'x', x );
  center_start.setAttributeNS(null, 'y', y );
}

function reposition_lines() {
  var line_vert = document.querySelectorAll('.line_vertical');
  var line_horiz = document.querySelectorAll('.line_horizontal');

  for (let i = 0; i <= NUM_ROWS_COLS; i++) {
    line_vert[i].setAttributeNS(null, 'x1', i * CELL_SIZE);
    line_vert[i].setAttributeNS(null, 'y1', 0);
    line_vert[i].setAttributeNS(null, 'x2', i * CELL_SIZE);
    line_vert[i].setAttributeNS(null, 'y2', CELL_SIZE * NUM_ROWS_COLS);
    line_vert[i].setAttributeNS(null, 'stroke_width', 2);
  }
  for (let i = 0; i <= NUM_ROWS_COLS; i++) {
    line_horiz[i].setAttributeNS(null, 'x1', 0);
    line_horiz[i].setAttributeNS(null, 'y1', i * CELL_SIZE);
    line_horiz[i].setAttributeNS(null, 'x2', CELL_SIZE * NUM_ROWS_COLS);
    line_horiz[i].setAttributeNS(null, 'y2', i * CELL_SIZE);
    line_horiz[i].setAttributeNS(null, 'stroke_width', 2);
  }

}

function reposition_grid() {
  if (AppOrientation == HORIZ) {
    PlaySpace.setAttributeNS(null, "x", grid_offset_xy);
    PlaySpace.setAttributeNS(null, "y", 0);
  } else {
    PlaySpace.setAttributeNS(null, "x", 0);
    PlaySpace.setAttributeNS(null, "y", grid_offset_xy);
  }
  reposition_lines();
  reposition_safe_squares();
  reposition_center_start();
  reposition_played_tiles();
}

function reposition_player_scorebd() {
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

  // the p2 photo
  tmp = player2_photo.getAttributeNS(null, "x");
  player2_photo.setAttributeNS(null, "x", player2_photo.getAttributeNS(null, "y"));
  player2_photo.setAttributeNS(null, "y", tmp);
  tmp = player2_photo.getAttributeNS(null, "width");
  player2_photo.setAttributeNS(null, "width", player2_photo.getAttributeNS(null, "height"));
  player2_photo.setAttributeNS(null, "height", tmp);
}

// only on an AppOrientation change
function reposition_scorebd() {
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

  reposition_player_scorebd();
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
  
  // This section will have to be specific to each AppOrientation
  // if (AppOrientation == HORIZ) {
    tmp = parseInt(play_svg.getAttributeNS(null, "x"));
    play_svg.setAttributeNS(null, "x", parseInt(play_svg.getAttributeNS(null, "y")) );
    play_svg.setAttributeNS(null, "y", tmp );
    tmp = parseInt(play_click.getAttributeNS(null, "x"));
    play_click.setAttributeNS(null, "x", parseInt(play_click.getAttributeNS(null, "y")) );
    play_click.setAttributeNS(null, "y", tmp );
  // } else {
    // tmp = parseInt(play_svg.getAttributeNS(null, "x"));
    // play_svg.setAttributeNS(null, "x", parseInt(play_svg.getAttributeNS(null, "y")) - 10);
    // play_svg.setAttributeNS(null, "y", tmp + 30);
    // tmp = parseInt(play_click.getAttributeNS(null, "x"));
    // play_click.setAttributeNS(null, "x", parseInt(play_click.getAttributeNS(null, "y")) - 10);
    // play_click.setAttributeNS(null, "y", tmp + 30);
  // }

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

function reposition_controls(){
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

function reposition_tiles_left() {
  var left_tiles = document.querySelector('#tiles_left');
  var left_tiles_vert = document.querySelector('#tiles_left_vert');
  var left_tiles_count = document.querySelector('#tiles_left_count');

  let tmp = left_tiles_count.getAttributeNS(null, "x");

  if (AppOrientation == HORIZ) {
    left_tiles.setAttributeNS(null, "x", 380);
    left_tiles.setAttributeNS(null, "y", 130);
    left_tiles_vert.setAttributeNS(null, "transform", "rotate(-90.5876, 277.2, 241.8)");
    left_tiles_count.setAttributeNS(null, "x", 550);
    left_tiles_count.setAttributeNS(null, "y", 290);
  } else {
    left_tiles.setAttributeNS(null, "x", -120);
    left_tiles.setAttributeNS(null, "y", 415);
    left_tiles_vert.setAttributeNS(null, "transform", "rotate(0, 277.2, 136.8)");
    left_tiles_count.setAttributeNS(null, "x", 250);
    left_tiles_count.setAttributeNS(null, "y", 557);
  }
}

function reposition_s_count() {
  var svg  = document.querySelector('#s_count');
  var ss = document.querySelectorAll('.s_count');
  let tmp = null;

  // first reorient th S's
  ss.forEach(t => {
    tmp = t.getAttributeNS(null, "x");
    t.setAttributeNS(null, "x", t.getAttributeNS(null, "y"));
    t.setAttributeNS(null, "y", tmp);
  });

  // now the svg
  if (AppOrientation == HORIZ) {
    let tmp = svg.getAttributeNS(null, "x");
    svg.setAttributeNS(null, "x", svg.getAttributeNS(null, "y"));
    svg.setAttributeNS(null, "y", "90");
    tmp = svg.getAttributeNS(null, "width");
    svg.setAttributeNS(null, "width", svg.getAttributeNS(null, "height"));
    svg.setAttributeNS(null, "height", tmp);
    svg.setAttributeNS(null, "viewBox", "-10 -20 35 140");
  }
  else {
    let tmp = svg.getAttributeNS(null, "x");
    svg.setAttributeNS(null, "x", "320");
    svg.setAttributeNS(null, "y", tmp);
    tmp = svg.getAttributeNS(null, "width");
    svg.setAttributeNS(null, "width", svg.getAttributeNS(null, "height"));
    svg.setAttributeNS(null, "height", tmp);
    svg.setAttributeNS(null, "viewBox", "-20 -20 140 35");
  }
}

function reposition_player_hand() {
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
function reposition_board() {
  reposition_scorebd();
  reposition_grid();
  reposition_controls();
  reposition_tiles_left();
  reposition_s_count();
  reposition_player_hand();
}

function changeLayout() {
  var scorebd = document.getElementById("scoreboard_bg");
  var player_pnl = document.getElementById("player_panel");

reposition_board();
}
