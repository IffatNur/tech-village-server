const express = require('express');
const cors = require('cors');
const app = express();
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

async function run(){
    try{
        const categoryCollection = client.db("techVIllage").collection("categories");
        const productCollection = client.db("techVIllage").collection("products");
        const userCollection = client.db("techVIllage").collection("users");
        const bookingCollection = client.db("techVIllage").collection("bookings");

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

        app.post('/booking', async(req,res) =>{
            const query = req.body;
            const result = await bookingCollection.insertOne(query);
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
