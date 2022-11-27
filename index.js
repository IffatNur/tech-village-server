const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SK);

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
        const reportedCollection = client.db("techVIllage").collection("reportedItems");
        const paymentCollection = client.db("techVIllage").collection("payments");

        app.post("/create-payment-intent", async (req, res) => {
          const booking = req.body;
          const price = booking.price;
          const amount = price * 100;

          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            "payment_method_types": ["card"],
          });
          res.send({
            clientSecret: paymentIntent.client_secret,
          });
        });

        app.post('/payment', async(req,res) =>{
          const query = req.body;
          const result = await paymentCollection.insertOne(query);
          const id = query.booking_id;
          const filter = {_id: ObjectId(id)};
          const updateDoc = {
            $set: {
              paid: true,
              transactionId: query.transaction_id,
            },
          };
          const updatedInfo = await bookingCollection.updateOne(filter, updateDoc);
          const productId = query.product_id;
          const productFilter = {_id: ObjectId(productId)};
          const updateProduct = {
            $set:{
              paid: true
            }
          }
          const updateProductInfo = await productCollection.updateOne(productFilter,updateProduct);
          res.send(result);
        })

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
          res.status(403).send({ message: "denied" });
        });

        app.post("/jwt", async (req, res) => {
          const user = req.body;
          console.log(user);
          const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
            expiresIn: "10h",
          });
          res.send({ token });
        });

        const verifyAdmin = async (req, res, next) => {
          const decoded = req.decoded.email;
          const query = { email: decoded };
          const user = await userCollection.findOne(query);
          if (user?.role !== "admin") {
            return res.status(403).send("Forbidden Access");
          }
          next();
        };
        const verifySeller = async (req, res, next) => {
          const decoded = req.decoded.email;
          const query = { email: decoded };
          const user = await userCollection.findOne(query);
          if (user?.role !== "seller") {
            return res.status(403).send("Forbidden Access");
          }
          next();
        };

        app.get('/category', async(req,res)=>{
            const query = {};
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/category/:id',async(req,res)=>{
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

        app.put('/users/:email', async(req,res) =>{
          const email = req.params.email;
          console.log(email);
          const filter = {email: email};
          const updateDoc = {
            $set:{
              isVerified: true
            }
          };
          const options = {upsert: true};
          const result = await userCollection.updateOne(filter,updateDoc,options)
          res.send(result);
        })

        app.get('/user/:email', async(req,res) =>{
            const email = req.params.email;
            const query = {email:email};
            const result= await userCollection.findOne(query);
            res.send({isUser: result?.role});
        })

        app.post('/booking',verifyJWT, async(req,res) =>{
            const query = req.body;
            const result = await bookingCollection.insertOne(query);
            res.send(result);
        })

        app.get('/booking',verifyJWT, async(req,res)=>{
            const email = req.query.email;
            const query = {email: email};
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/booking/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })

        app.post('/report', async(req,res) =>{
          const query = req.body;
          const result = await reportedCollection.insertOne(query);
          res.send(result);
        })

        app.get('/report', async(req, res) =>{
          const query = {};
          const result = await reportedCollection.find(query).toArray() ;
          res.send(result);
        })

        app.get("/products", async (req, res) => {
          const query = {};
          const result = await productCollection.find(query).toArray();
          res.send(result);
        });

        app.post("/product", verifyJWT,verifySeller, async (req, res) => {
          const product = req.body;
          const result = await productCollection.insertOne(product);
          const sellerEmail = product.email;
          const query = { email: sellerEmail };
          const findVerified = await userCollection.findOne(query);
          if (findVerified.isVerified){
            const updateDoc = {
              $set:{
                isVerified: true
              }
            }
            const updateProduct = await productCollection.updateMany(query,updateDoc);
          } 
          res.send(result);
        });

        app.get("/product", verifyJWT,verifySeller, async (req, res) => {
          const email = req.query.email;
          const query = { email: email };
          const result = await productCollection.find(query).toArray();
          res.send(result);
        });

        app.put("/product/:id", verifyJWT,verifySeller, async (req, res) => {
          const id = req.params.id;
          const filter = {_id: ObjectId(id)};
          const updateDoc = { 
            $set:{
              status:'sold'
            }
           };
          const options = {upsert: true};
          const result = await productCollection.updateOne(
            filter,
            updateDoc,
            options
          );
          res.send(result);
        });

        app.put("/productad/:id", verifyJWT,verifySeller, async (req, res) => {
          const id = req.params.id;
          const filter = {_id: ObjectId(id)};
          const updateDoc = { 
            $set:{
              advertise: true
            }
           };
          const options = {upsert: true};
          const result = await productCollection.updateOne(
            filter,
            updateDoc,
            options
          );
          res.send(result);
        });

        app.delete("/product/:id",  async (req, res) => {
          const id = req.params.id;
          const query = { _id: ObjectId(id) };
          const result = await productCollection.deleteOne(query);
          res.send(result);
        });

        app.delete("/report/:id",  async (req, res) => {
          const id = req.params.id;
          const query = { _id: ObjectId(id) };
          const result = await reportedCollection.deleteOne(query);
          res.send(result);
        });

        app.get("/allbuyer", verifyJWT,verifyAdmin, async (req, res) => {
          const query = { role: "buyer" };
          const result = await userCollection.find(query).toArray();
          res.send(result);
        });

        app.delete("/user/:id", verifyJWT,verifyAdmin, async (req, res) => {
          const id = req.params.id;
          const query = { _id: ObjectId(id) };
          const result = await userCollection.deleteOne(query);
          res.send(result);
        });

        app.get("/allseller", verifyJWT,verifyAdmin, async (req, res) => {
          const query = { role: "seller" };
          const result = await userCollection.find(query).toArray();
          res.send(result);
        });
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
