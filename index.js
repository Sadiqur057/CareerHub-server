const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser())





console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x7pm4nr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const DB = client.db('tastyBites')
    const foodsCollection = DB.collection('foods')
    const requestedFoodCollection = DB.collection('requested-food')




    // service related api
    app.get('/all-foods', async (req, res) => {
      const query = { food_status: "available" }
      const cursor = foodsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/search/:keyword', async (req, res) => {
      const keyword = req.params.keyword;
      const cursor = foodsCollection.find({
        $and: [
          { food_name: { $regex: keyword, $options: 'i' } },
          { food_status: "available" }
        ]
      })
      const result = await cursor.toArray();
      res.send(result)
    })

    // get specific food details
    app.get('/food-details/', logger, verifyToken, async (req, res) => {
      const id = req.query.id;
      const email = req.query.email;
      console.log(id,email)
      // const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodsCollection.findOne(query);
      res.send(result);
    })

    app.get('/my-requested-foods/:email', logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log('token owner info', req.user)
      if(req.user.email !== req.params.email){
        return res.status(403).send({ message: "forbidden access"})
      }
      const query = { email: email }
      console.log(email)
      const cursor = requestedFoodCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/my-foods/:email', async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email }
      console.log(email)
      const cursor = foodsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/add-food', async (req, res) => {
      const data = req.body;
      const result = await foodsCollection.insertOne(data)
      res.send(result)
    })

    app.post('/requested-food', async (req, res) => {
      const data = req.body;
      console.log(data)
      const result = await requestedFoodCollection.insertOne(data);
      res.send(result)
    })

    app.delete('/delete-food/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodsCollection.deleteOne(query)
      console.log(result)
      res.send(result)
    })

    app.put('/edit-food/:id', async (req, res) => {
      const foodData = req.body;
      const id = foodData.id;
      console.log(foodData)
      const filter = { _id: new ObjectId(id) }
      console.log(id)
      const options = { upsert: true }
      const food_name = foodData.food_name;
      const image = foodData.image
      const location = foodData.location
      const expired_date = foodData.expired_date
      const notes = foodData.notes
      const food_status = foodData.food_status
      const food_quantity = foodData.food_quantity
      const updatedDoc = {
        $set: {
          food_name: food_name,
          image: image,
          food_quantity: food_quantity,
          location: location,
          expired_date: expired_date,
          notes: notes,
          food_status: food_status
        }
      }
      const result = await foodsCollection.updateOne(filter, updatedDoc, options)
      console.log(result);
      res.send(result)
    })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`App is running: http://localhost:${port}`)
})