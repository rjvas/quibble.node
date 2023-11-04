// Aaron vs
db.active_games.findAndModify(
{
  query: {"_id" : ObjectId("60a8518bcc210070b77cdec1")},
  update :
  {
    "name" : "Aaron vs Andee : Fri May 21 2021 19:33:58",
    "game_id" :  ObjectId("60a8518bcc210070b77cdebf"),
    "status" : 1,
    "user1_id" : ObjectId("608b6a7fcc210070b776c8c3"),
    "user2_id" : ObjectId("60a52ecacc210070b77c329b")
  }
})

db.active_games.findAndModify(
{
  query: {"_id" : ObjectId("60a973eccc210070b77d1c1e")},
  update :
  {
    "name" : "Aaron vs Aaron : Sat May 22 2021 15:30:55",
    "game_id" : ObjectId("60a973eccc210070b77d1c1c"),
    "status" : 33,
    "user1_id" : ObjectId("608b6a7fcc210070b776c8c3"),
    "user2_id" : ObjectId("608b6a7fcc210070b776c8c3")
  }
})

db.active_games.findAndModify(
{
  query: {"_id" : ObjectId("60abf4cacc210070b77da2c0")},
  update :
  {
    "name" : "Aaron vs Andee : Mon May 24 2021 13:46:50",
    "game_id" : ObjectId("60abf4cacc210070b77da2be"),
    "status" : 1,
    "user1_id" : ObjectId("608b6a7fcc210070b776c8c3"),
    "user2_id" : ObjectId("60a52ecacc210070b77c329b")
  }
})

db.active_games.findAndModify(
{
  query: {"_id" : ObjectId("60afb8ebcc210070b77e6e80")},
  update :
  {
    "name" : "Aaron vs Andee : Thu May 27 2021 10:20:41",
    "game_id" : ObjectId("60afb8ebcc210070b77e6e7e"),
    "status" : 1,
    "user1_id" : ObjectId("608b6a7fcc210070b776c8c3"),
    "user2_id" : ObjectId("60a52ecacc210070b77c329b")
  }
})


{ "_id" : ObjectId("608f6897cc210070b7779f6d"), "name_time" : "Aaron vs Aaron : Sun May 02 2021 22:04:02" }
{ "_id" : ObjectId("60a52fc6cc210070b77c32d7"), "name_time" : "Aaron vs Andee : Wed May 19 2021 10:32:14" }
{ "_id" : ObjectId("60a71e7dcc210070b77c9ccb"), "name_time" : "Aaron vs Andee : Thu May 20 2021 21:43:57" }
{ "_id" : ObjectId("60a8518bcc210070b77cdebf"), "name_time" : "Aaron vs Andee : Fri May 21 2021 19:33:58" }
{ "_id" : ObjectId("60a973eccc210070b77d1c1c"), "name_time" : "Aaron vs Aaron : Sat May 22 2021 15:30:55" }
{ "_id" : ObjectId("60abf4cacc210070b77da2be"), "name_time" : "Aaron vs Andee : Mon May 24 2021 13:46:50" }
{ "_id" : ObjectId("60afb8ebcc210070b77e6e7e"), "name_time" : "Aaron vs Andee : Thu May 27 2021 10:20:41" }



// Andee vs
  db.active_games.findAndModify(
  {
    query: {"_id" : ObjectId("60a70005cc210070b77c9621")},
    update :
    {
          "name" : "Andee vs dick : Thu May 20 2021 19:33:11",
          "status" : 1,
          "user1_id" : ObjectId("60a52ecacc210070b77c329b"),
          "user2_id" : ObjectId("60849f77cc210070b7755b82"),
          "game_id" : ObjectId("60a70005cc210070b77c961f")
    }
  })

  db.active_games.findAndModify(
  {
    query: {"_id" : ObjectId("60a82f58cc210070b77cd721")},
    update :
    {
      "name" : "Andee vs Aaron : Fri May 21 2021 17:07:53",
      "game_id" : ObjectId("60a82f58cc210070b77cd71f"),
      "status" : 1,
      "user1_id" : ObjectId("60a52ecacc210070b77c329b"),
      "user2_id" : ObjectId("608b6a7fcc210070b776c8c3")
    }
  })

  db.active_games.findAndModify(
  {
    query: {"_id" : ObjectId("60abf70dcc210070b77da342")},
    update :
    {
      "name" : "Andee vs dick : Mon May 24 2021 13:55:26",
      "game_id" : ObjectId("60abf70dcc210070b77da340"),
      "status" : 1,
      "user1_id" : ObjectId("60a52ecacc210070b77c329b"),
      "user2_id" : ObjectId("60849f77cc210070b7755b82")
    }
  })
  db.active_games.findAndModify(
  {
    query: {"_id" : ObjectId("60ad52f8cc210070b77dec5e")},
    update :
    {
      "name" : "Andee vs Aaron : Tue May 25 2021 14:41:14",
      "game_id" : ObjectId("60ad52f8cc210070b77dec5c"),
      "status" : 1,
      "user1_id" : ObjectId("60a52ecacc210070b77c329b"),
      "user2_id" : ObjectId("608b6a7fcc210070b776c8c3")
    }
  })

  db.active_games.findAndModify(
  {
    query: {"_id" : ObjectId("60ae8a0fcc210070b77e2eba")},
    update :
    {
      "name" : "Andee vs Aaron : Wed May 26 2021 12:47:09",
      "game_id" : ObjectId("60ae8a0fcc210070b77e2eb8"),
      "status" : 1,
      "user1_id" : ObjectId("60a52ecacc210070b77c329b"),
      "user2_id" : ObjectId("608b6a7fcc210070b776c8c3")
    }
  })
  db.active_games.findAndModify(
  {
    query: {"_id" : ObjectId("60aecb8acc210070b77e3cbf")},
    update :
    {
      "name" : "Andee vs Aaron : Wed May 26 2021 17:27:46",
      "game_id" : ObjectId("60aecb8acc210070b77e3cbd"),
      "status" : 1,
      "user1_id" : ObjectId("60a52ecacc210070b77c329b"),
      "user2_id" : ObjectId("608b6a7fcc210070b776c8c3")
    }
  })

  { "_id" : ObjectId(""), "name_time" : "Andee vs dick : Thu May 20 2021 19:33:11" }
  { "_id" : , "name_time" : "Andee vs Aaron : Fri May 21 2021 17:07:53" }
  { "_id" : ObjectId("60abf70dcc210070b77da340"), "name_time" : "Andee vs dick : Mon May 24 2021 13:55:26" }
  { "_id" : , "name_time" : "Andee vs Aaron : Tue May 25 2021 14:41:14" }
  { "_id" : , "name_time" : "Andee vs Aaron : Wed May 26 2021 12:47:09" }
  { "_id" : , "name_time" : "Andee vs Aaron : Wed May 26 2021 17:27:46" }
