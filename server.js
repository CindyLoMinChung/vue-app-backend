const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb"); // Use the native driver as per the criteria
const app = express();
const PORT = process.env.PORT || 3000;
const uri = "your-mongodb-atlas-connection-string"; // Replace with your actual MongoDB Atlas URI

app.use(cors());

let db;

// Connect to MongoDB Atlas
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((client) => {
    console.log("Connected to MongoDB Atlas");
    db = client.db("your-database-name"); // Replace with your actual database name
  })
  .catch((error) => console.error(error));

// Endpoint to get lessons
app.get("/api/lessons", async (req, res) => {
  try {
    const lessons = await db.collection("lessons").find().toArray();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching lessons" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
