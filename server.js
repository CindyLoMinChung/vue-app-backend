// Import dependencies and define data base connection string
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const app = express();
const PORT = process.env.PORT || 3000;
const uri = "your-mongodb-atlas-connection-string";
app.use(cors());

let db;

// Connect to MongoDB Atlas
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }) // The userNewUrlParser and useUnifiesTopology help MongoDB manage connections and parse URIs more efficiently.
  .then((client) => {
    console.log("Connected to MongoDB Atlas");
    db = client.db("your-database-name");
  })
  .catch((error) => console.error(error));

// Endpoint to fetch lessons
app.get("/api/lessons", async (req, res) => {
  try {
    const lessons = await db.collection("lessons").find().toArray();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching lessons" });
  }
});

// Message to say that the server is listening to the port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
