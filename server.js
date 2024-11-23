// Import dependencies
const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.set("json spaces", 3); // JSON response formatting for debugging

// Logger Middleware: Logs all requests
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} request to ${req.url}`
  );
  next();
});

// Static File Middleware for lesson images
const lessonImagesPath = path.join(__dirname, "images");
app.use("/images", express.static(lessonImagesPath));

// Handle missing files
app.use((req, res, next) => {
  if (req.path.startsWith("/images") && !req.path.includes(".")) {
    res.status(404).json({ error: "File not found" });
  } else {
    next();
  }
});

// Extract values from the properties file
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// MongoDB Connection URI
const uri = `${dbPrefix}${dbUser}:${dbPassword}@${dbHost}${dbParams}`;
console.log(`MongoDB Connection URI: ${uri}`);

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

// Function to connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    db = client.db(dbName);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // Exit process on failure
  }
}

connectDB(); // Establish MongoDB connection

// Middleware for handling collections dynamically
app.param("collectionName", async function (req, res, next, collectionName) {
  try {
    const collectionExists =
      (await db.listCollections({ name: collectionName }).toArray()).length > 0;
    if (!collectionExists) {
      return res
        .status(404)
        .json({ error: `Collection "${collectionName}" does not exist.` });
    }
    req.collection = db.collection(collectionName);
    next();
  } catch (err) {
    console.error(`Error checking collection "${collectionName}":`, err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET route to fetch lessons
app.get("/lessons", async (req, res) => {
  try {
    const lessons = await db.collection("lessons").find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error("Error fetching lessons:", err.message);
    res.status(500).json({ error: "Failed to fetch lessons." });
  }
});

// POST route to save a new order
app.post("/orders", async (req, res) => {
  try {
    const order = req.body;
    if (!order.name || !order.phone || !order.lessonIDs || !order.spaces) {
      return res.status(400).json({ error: "Invalid order format." });
    }
    const result = await db.collection("orders").insertOne(order);
    res.json({ message: "Order created successfully.", result });
  } catch (err) {
    console.error("Error creating order:", err.message);
    res.status(500).json({ error: "Failed to create order." });
  }
});

// PUT route to update lessons
app.put("/lessons/:id", async (req, res) => {
  try {
    const lessonId = new ObjectId(req.params.id);
    const updatedLesson = req.body;
    const result = await db
      .collection("lessons")
      .updateOne({ _id: lessonId }, { $set: updatedLesson });
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "Lesson not found or no changes applied." });
    }
    res.json({ message: "Lesson updated successfully.", result });
  } catch (err) {
    console.error("Error updating lesson:", err.message);
    res.status(500).json({ error: "Failed to update lesson." });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "An internal error occurred." });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
