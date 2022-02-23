const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rjdme.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//firebase admin configuration
const admin = require("firebase-admin");
//firebase admin authorization
const serviceAccount = require("./ema-john-store-c3600-firebase-adminsdk-fcokr-2c62ec5adb.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middleware
const app = express();
const Port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }

  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("online_Shop");
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");

    //Product GET API
    app.get("/products", async (req, res) => {
      // console.log(req.query);
      const cursor = productCollection.find({});
      const page = req.query.page;
      const size = parseInt(req.query.size);
      const count = await cursor.count();
      let products;
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }
      res.send({
        count,
        products,
      });
    });

    //POST API Products gets to Key
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    //Add Order API
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };

        const cursor = await orderCollection.find(query);
        const orders = await cursor.toArray();
        res.json(orders);
      } else {
        res.status(401).send("UnAuthorized User");
      }
    });
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      orders.createdAt = new Date();
      console.log(orders.createdAt);
      const results = await orderCollection.insertOne(orders);
      res.json(results);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("update all here");
});
app.listen(Port, () => {
  console.log(`Listening on port:${Port}`);
});
