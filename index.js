const express = require("express");
const cors = require("cors");
const bodyparser = require("body-parser");
const mongoclient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
const bcrypt = require("bcrypt");
const { restart } = require("nodemon");
const app = express();
app.use(cors());
app.use(bodyparser.json());
const databaselink = "mongodb://localhost:27017";
const databasename = "LoginDemo";
const usercollection = "Users";
const sessioncollection = "Sessions";

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
            return res.send({
              success: true,
              message: "Success",
            });
          }
        });
    });
  });
});
app.post("/api/account/signin", (req, res) => {
  var json = JSON.parse(req.body.body);

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

const port = 5000;
app.listen(port);
