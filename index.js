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
    'http://localhost:5173',
    'https://hub-career.web.app',
    'https://hub-career.firebaseapp.com'
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser())

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

app.use(express.json());
app.use(cookieParser())


// middlewares
const logger = (req, res, next) => {
  next()
}

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
  //   if (err) {
  //     return res.status(401).send({ message: 'unauthorized access' })
  //   }
  //   req.user = decoded
  //   next();
  // })
}


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


    const DB = client.db('CareerHubDB')
    const jobsCollection = DB.collection('jobs')
    const appliedJobsCollection = DB.collection('applied-jobs')


    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
      res.cookie('token', token, cookieOptions).send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', { ...cookieOptions, maxAge: 0 }).send({ success: true })
    })


    // service related api
    app.get('/all-jobs', async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // get specific job details
    app.get('/job-details/', logger, async (req, res) => {
      const id = req.query.id;
      const email = req.query.email;
      // if (req.user.email !== email) {
      //   return res.status(403).send({ message: "forbidden access" })
      // }
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })

    app.get('/my-jobs/:email', logger,  async (req, res) => {
      const email = req.params.email;

      // if (req.user.email !== req.params.email) {
      //   return res.status(403).send({ message: "forbidden access" })
      // }

      const query = { user_email: email }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })


    app.get('/my-applied-jobs/:email', logger,  async (req, res) => {
      const email = req.params.email;

      // if (req.user.email !== req.params.email) {
      //   return res.status(403).send({ message: "forbidden access" })
      // }

      const query = { user_email: email }
      const cursor = appliedJobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/search/:keyword', async (req, res) => {
      const keyword = req.params.keyword;
      const cursor = jobsCollection.find({
        job_title: {
          $regex: keyword,
          $options: 'i'
        }
      });
      const result = await cursor.toArray();
      res.send(result)
    })


    app.post('/add-job', async (req, res) => {
      const data = req.body;
      const result = await jobsCollection.insertOne(data)
      res.send(result)
    })


    // app.post('/add-job', async (req, res) => {
    //   const data = req.body;
    //   const result = await jobsCollection.insertOne(data)
    //   res.send(result)
    // })

    app.post('/applied-job', async (req, res) => {
      const data = req.body;
      const result = await appliedJobsCollection.insertOne(data);
      res.send(result)
    })



    app.delete('/delete-job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.deleteOne(query)
      res.send(result)
    })


    app.put('/edit-job/:id', async (req, res) => {
      const jobData = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const job_title = jobData.job_title
      const salary_range = jobData.salary_range
      const description = jobData.description
      const image = jobData.image
      const job_type = jobData.job_type
      const deadline = jobData.deadline
      const updatedDoc = {
        $set: {
          job_title: job_title,
          salary_range: salary_range,
          description: description,
          image: image,
          job_type: job_type,
          deadline: deadline
        }
      }
      const result = await jobsCollection.updateOne(filter, updatedDoc, options)
      res.send(result)
    })

    app.put('/update-job/:id', async (req, res) => {
      const id = req.params.id
      const applicants_number = req.body.newApplicantsNumber
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          applicants_number: applicants_number
        }
      }
      const result = await jobsCollection.updateOne(filter, updatedDoc, options)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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