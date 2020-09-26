const express = require("express");
const cors = require("cors");
const bodyparser = require("body-parser");
const mongoclient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(bodyparser.json());
const databaselink = "mongodb://localhost:27017";
const databasename = "LoginDemo";
const forumdatabase = "ForumDemo";
const usercollection = "Users";
const sessioncollection = "Sessions";
const profilecollection = "Profile"
const commentscollection = "Comments"
const threadcollection = "Threads"

app.post("/api/account/signup", (req, res) => {
  var json = JSON.parse(req.body.body);

  const userinfo = {
    email: json.email,
    username: json.username,
    password: bcrypt.hashSync(json.password, bcrypt.genSaltSync(8), null),
  };
  mongoclient.connect(databaselink, (err, client) => {
    var db = client.db(databasename);
    db.collection(usercollection, (err, collection) => {
      collection
        .find({
          $or: [{ email: userinfo.email }, { username: userinfo.username }],
        })
        .toArray((err, result) => {
          if (result.length > 0) {
            return res.send({
              success: false,
              message: "Email or username already in use",
            });
          } else {
            collection.insertOne(userinfo);
            collection.find({ username: userinfo.username }).toArray((err, result) => {
              db.collection(profilecollection, (err, collection) => {
                var userprofile = {
                  userId: result[0]._id.toString(),
                  username: userinfo.username,
                  email: userinfo.email,
                  fullName: "",
                  birthday: "",
                  userinfo: ""
                }
                collection.insertOne(userprofile)
              })
              db.collection(sessioncollection, (err, collection) => {
                collection.insertOne({
                  userId: result[0]._id.toString(),
                  timestamp: new Date(),
                  isDeleted: false,
                });
              });
              return res.send({
                success: true,
                message: "Success",
                token: result[0]._id.toString()
              });
            })

          }
        });
    });
  });
});
app.post("/api/account/signin", (req, res) => {
  var json = req.body;

  const userinfo = {
    username: json.username,
    password: json.password,
  };
  mongoclient.connect(databaselink, (err, client) => {
    var db = client.db(databasename);
    db.collection(usercollection, (err, collection) => {
      collection
        .find({ username: userinfo.username })
        .toArray((err, result) => {
          if (result.length > 0) {
            if (bcrypt.compareSync(userinfo.password, result[0].password)) {
              db.collection(sessioncollection, (err, collection) => {
                collection.insertOne({
                  userId: result[0]._id.toString(),
                  timestamp: new Date(),
                  isDeleted: false,
                });
              });
              return res.send({
                success: true,
                message: "Login successful",
                token: result[0]._id.toString(),
              });
            } else {
              return res.send({
                success: false,
                message: "Incorrect password",
              });
            }
          } else {
            return res.send({
              success: false,
              message: "Username not found",
            });
          }
        });
    });
  });
});

app.get("/api/account/verify", (req, res) => {
  var query = req.query;
  var token = query.token;
  console.log(token);
  if (token == "null") {
    console.log("This code should not be working");
    return res.send({
      session: false,
    });

  } else {
    mongoclient.connect(databaselink, (err, client) => {
      var db = client.db(databasename);
      db.collection(sessioncollection, (err, collection) => {
        collection.find({ "userId": token }).toArray((err, result) => {
          console.log(result.length);
          if (result.length > 0) {
            return res.send({
              session: true,
            });
          } else {
            return res.send({
              session: false,
            });
          }
        });
      });
    });
  }
});
app.get("/api/account/signout", (req, res) => {
  var token = req.query.token
  console.log(token)
  mongoclient.connect(databaselink, (err, client) => {
    var db = client.db(databasename)
    db.collection(sessioncollection, (err, collection) => {
      collection.remove({ "userId": token })
      collection.find({ "userId": token }).toArray((err, result) => {
        if (result.length == 0) {
          return res.send({ success: true })
        } else {
          return res.send({ success: false })
        }
      })
    })
  })
})

app.get("/api/account/getprofile", (req, res) => {
  var token = req.query.token
  mongoclient.connect(databaselink, (err, client) => {
    var db = client.db(databasename)
    db.collection(profilecollection, (err, collection) => {
      collection.find({ "userId": token }).toArray((err, result) => {
        if (result.length > 0) {
          return res.send(result[0])
        }
      })
    })
  })
})

app.post("/api/account/changeprofile", (req, res) => {
  var json = req.body

  mongoclient.connect(databaselink, (err, client) => {
    var db = client.db(databasename)
    db.collection(profilecollection, (err, collection) => {
      collection.updateOne({ userId: req.body.userId }, { $set: { fullName: req.body.fullName, birthday: req.body.birthday, userinfo: req.body.userinfo } })
    })
  })
})

app.get("/api/forums/threads", (req, res) => {
  mongoclient.connect(databaselink, (err, client) => {
    var db = client.db(forumdatabase)
    db.collection(threadcollection, (err, collection) => {
      collection.find().toArray((err, result) => {

        res.json(result)
      })
    })
  })
})

app.post("/api/forums/newthread", (req, res) => {
  console.log("Someone wants to make a new thread")
  var json = JSON.parse(req.body.body);
  json['votes'] = 0
  console.log(json)
  mongoclient.connect(databaselink, (err, client) => {
    var db2 = client.db(databasename)
    db2.collection(usercollection, (err, collection) => {
      collection.find({
        "_id": json.userId
      }).toArray((err, result) => {
        delete json["userId"]
        json["username"] = result[0].username
      })
    })
    var db = client.db(forumdatabase)

    db.collection(threadcollection, (err, collection) => {

      collection.insertOne(json)
    })
  })
  res.json({
    success: true
  })
})

const port = 5000;
app.listen(port);
