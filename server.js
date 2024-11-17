// Import dependencies
const express = require("express");
const cors = require("cors");
const path = require("path");
const PropertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.set("json spaces", 3);

// Load database configuration from properties file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Declare variable for the database

// Connect to MongoDB Atlas
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db1 = client.db(dbName); // Use the database name from properties
  } catch (err) {
    // Meaningful error
    console.error("MongoDB connection error:", err.message);
    console.error(
      "Possible solutions:\n" +
        "1. Ensure your MongoDB URI is correct in dbconnection.properties.\n" +
        "2. Check your IP whitelist settings in MongoDB Atlas.\n" +
        "3. Verify that your database user credentials are correct."
    );
    process.exit(1); // Exit process if database connection fails
  }
}

connectDB(); // Call the connectDB function to connect to MongoDB database

// Middleware to set the collection based on URL parameter
app.param("collectionName", function (req, res, next, collectionName) {
  try {
    req.collection = db1.collection(collectionName); // Use db1
    console.log("Middleware set collection:", req.collection.collectionName); // For debugging
    next();
  } catch (err) {
    const message = `Error accessing collection "${collectionName}": ${err.message}`;
    console.error(message);
    res.status(400).json({ error: message });
  }
});

// Route to get all documents in a collection
app.get("/collections/:collectionName", async function (req, res, next) {
  try {
    const results = await req.collection.find({}).toArray();
    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: "No documents found in the collection." });
    }
    res.json(results);
  } catch (err) {
    const message = `Error fetching documents from collection "${req.params.collectionName}": ${err.message}`;
    console.error(message);
    res.status(500).json({ error: message });
  }
});

// Route to get limited, sorted documents in a collection
app.get(
  "/collections/:collectionName/limited",
  async function (req, res, next) {
    try {
      const results = await req.collection
        .find({})
        .limit(3)
        .sort({ price: -1 })
        .toArray();
      if (results.length === 0) {
        return res
          .status(404)
          .json({ error: "No documents found in the collection." });
      }
      res.json(results);
    } catch (err) {
      const message = `Error fetching limited documents from collection "${req.params.collectionName}": ${err.message}`;
      console.error(message);
      res.status(500).json({ error: message });
    }
  }
);

// Route to get a single document by ID
app.get("/collections/:collectionName/:id", async function (req, res, next) {
  try {
    const documentId = new ObjectId(req.params.id);
    const result = await req.collection.findOne({ _id: documentId });
    if (!result) {
      return res.status(404).json({
        error: `Document with ID "${req.params.id}" not found in collection "${req.params.collectionName}".`,
      });
    }
    res.json(result);
  } catch (err) {
    const message = `Error fetching document by ID "${req.params.id}" from collection "${req.params.collectionName}": ${err.message}`;
    console.error(message);
    res.status(500).json({ error: message });
  }
});

// Route to create a new document
app.post("/collections/:collectionName", async function (req, res, next) {
  try {
    const newDocument = req.body;
    if (!newDocument || Object.keys(newDocument).length === 0) {
      return res.status(400).json({ error: "Request body cannot be empty." });
    }
    const result = await req.collection.insertOne(newDocument);
    res.json({ message: "Document created successfully.", result });
  } catch (err) {
    const message = `Error creating document in collection "${req.params.collectionName}": ${err.message}`;
    console.error(message);
    res.status(500).json({ error: message });
  }
});

// Route to delete a document by ID
app.delete("/collections/:collectionName/:id", async function (req, res, next) {
  try {
    const documentId = new ObjectId(req.params.id);
    const result = await req.collection.deleteOne({ _id: documentId });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: `Document with ID "${req.params.id}" not found in collection "${req.params.collectionName}".`,
      });
    }
    res.json({ message: "Document deleted successfully.", result });
  } catch (err) {
    const message = `Error deleting document with ID "${req.params.id}" from collection "${req.params.collectionName}": ${err.message}`;
    console.error(message);
    res.status(500).json({ error: message });
  }
});

// Route to update a document by ID
app.put("/collections/:collectionName/:id", async function (req, res, next) {
  try {
    const documentId = new ObjectId(req.params.id);
    const updatedDocument = req.body;
    if (!updatedDocument || Object.keys(updatedDocument).length === 0) {
      return res.status(400).json({ error: "Request body cannot be empty." });
    }
    const result = await req.collection.updateOne(
      { _id: documentId },
      { $set: updatedDocument }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: `Document with ID "${req.params.id}" not found in collection "${req.params.collectionName}".`,
      });
    }
    res.json({ message: "Document updated successfully.", result });
  } catch (err) {
    const message = `Error updating document with ID "${req.params.id}" in collection "${req.params.collectionName}": ${err.message}`;
    console.error(message);
    res.status(500).json({ error: message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "An unexpected internal error occurred." });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
