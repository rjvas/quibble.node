
class TileDefs {

  constructor () {
    this.defs = [{
        char : "A",
        count : 9,
        is_safe : false,
        points : 1
      },
      {
        char: "B",
        count: 2,
        is_safe : false,
        points: 3
      },
      {
        char: "C",
        count: 2,
        is_safe : false,
        points: 3
      },
      {
        char: "D",
        count: 4,
        is_safe : false,
        points: 2
      },
      {
        char: "E",
        count: 12,
        is_safe : false,
        points: 1
      },
      {
        char: "F",
        count: 2,
        is_safe : false,
        points: 4
      },
      {
        char: "G",
        count: 3,
        is_safe : false,
        points: 2
      },
      {
        char: "H",
        count: 2,
        is_safe : false,
        points: 4
      },
      {
        char: "I",
        count: 9,
        is_safe : false,
        points: 1
      },
      {
        char: "J",
        count: 1,
        is_safe : true,
        points: 0
      },
      {
        char: "K",
        count: 1,
        is_safe : false,
        points: 5
      },
      {
        char: "L",
        count: 4,
        is_safe : false,
        points: 1
      },
      {
        char: "M",
        count: 2,
        is_safe : false,
        points: 3
      },
      {
        char: "N",
        count: 6,
        is_safe : false,
        points: 1
      },
      {
        char: "O",
        count: 8,
        is_safe : false,
        points: 1
      },
      {
        char: "P",
        count: 2,
        is_safe : false,
        points: 3
      },
      {
        char: "Q",
        count: 1,
        is_safe : true,
        points: 0
      },
      {
        char: "R",
        count: 6,
        is_safe : false,
        points: 1
      },
      {
        char: "S",
        count: 4,
        is_safe : false,
        points: 1
      },
      {
        char: "T",
        count: 6,
        is_safe : false,
        points: 1
      },
      {
        char: "U",
        count: 4,
        is_safe : false,
        points: 1
      },
      {
        char: "V",
        count: 2,
        is_safe : false,
        points: 4
      },
      {
        char: "W",
        count: 2,
        is_safe : false,
        points: 4
      },
      {
        char: "X",
        count: 1,
        is_safe : true,
        points: 0
      },
      {
        char: "Y",
        count: 2,
        is_safe : false,
        points: 2
      },
      {
        char: "Z",
        count: 1,
        is_safe : true,
        points: 0
      },
      {
        char: " ",
        count: 4,
        is_safe : false,
        points: 0
      }
    ];
  }

  is_safe_tile(tile) {
    return this.defs.find(item => {
      return tile.char == item.char && item.is_safe ? true : false;
    })
  }
}

exports.TileDefs = TileDefs;
