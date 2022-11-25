const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ypkrnke.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send("Forbidden Access");
    }
    req.decoded = decoded;
    next();
  });
}

async function run(){
    try{
        const categoryCollection = client.db("techVIllage").collection("categories");
        const productCollection = client.db("techVIllage").collection("products");
        const userCollection = client.db("techVIllage").collection("users");
        const bookingCollection = client.db("techVIllage").collection("bookings");

        app.get("/jwt", async (req, res) => {
          const email = req.query.email;
          const query = { email: email };
          const result = await userCollection.findOne(query);
          if (result) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
              expiresIn: "1h",
            });
            return res.send({ accessToken: token });
          }
          res.status(403).send({ accessToken: "" });
        });

        app.post("/jwt", async (req, res) => {
          const user = req.body;
          console.log(user);
          const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
            expiresIn: "10h",
          });
          res.send({ token });
        });

        app.get('/category', async(req,res)=>{
            const query = {};
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/category/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const findCategory = await categoryCollection.findOne(query);
            const category = findCategory.category_title;
            const categoryQuery = {category_title: category};
            const result = await productCollection.find(categoryQuery).toArray();
            res.send(result); 
        })

        app.post('/users', async(req,res) =>{
            const query = req.body;
            const result = await userCollection.insertOne(query);
            res.send(result);
        })

        app.get('/user/:email', async(req,res) =>{
            const email = req.params.email;
            console.log(email);
            const query = {email:email};
            const result= await userCollection.findOne(query);
            res.send({isUser: result?.role});
        })

        app.post('/booking', async(req,res) =>{
            const query = req.body;
            const result = await bookingCollection.insertOne(query);
            res.send(result);
        })

        app.get('/booking', async(req,res)=>{
            const email = req.query.email;
            const query = {email: email};
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/booking/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/product', async(req,res) =>{
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        app.get('/product', async(req,res)=>{
            const email = req.query.email;
            const query = {email:email};
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/allbuyer', async(req,res) =>{
            const query = {role: "buyer"};
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/allseller', async(req,res) =>{
            const query = {role: "seller"};
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })
    }
    finally{

    }
}

run().catch(err=>console.log(err))


app.get('/', (req,res) =>{
    res.send('Tech village server running...')
})

app.listen(port, ()=>{
    console.log('Server running on port', port);
})
