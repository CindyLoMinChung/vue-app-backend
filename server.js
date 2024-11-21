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
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON payloads
app.set("json spaces", 3); // Format JSON responses with 3 spaces for better readability

// Logger Middleware: Logs all requests to the console with timestamp
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} request to ${req.url}`
  );
  next();
});

// Static File Middleware: Serves lesson images or returns a 404 error if the file doesn't exist
const lessonImagesPath = path.join(__dirname, "images");
app.use("/images", express.static(lessonImagesPath));

// Handle missing files for lesson images
app.use((req, res, next) => {
  if (req.path.startsWith("/images") && !req.path.includes(".")) {
    res.status(404).json({ error: "File not found" });
  } else {
    next();
  }
});

// Load database configuration from properties file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract database connection details from the properties file
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// MongoDB connection URI
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
console.log(`MongoDB Connection URI: ${uri}`);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas in insecure mode");
    db = client.db("Coursework_fullstack_M00836347"); // Use your database name here
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // Exit the process on connection failure
  }
}

connectDB(); // Call the function to establish the database connection

// Middleware to check if a collection exists and set the collection
app.param("collectionName", async function (req, res, next, collectionName) {
  try {
    // Check if the collection exists in the database
    const collectionExists =
      (await db1.listCollections({ name: collectionName }).toArray()).length >
      0;
    if (!collectionExists) {
      return res
        .status(404)
        .json({ error: `Collection "${collectionName}" does not exist.` });
    }
    req.collection = db1.collection(collectionName); // Attach the collection to the request object
    next();
  } catch (err) {
    console.error(`Error checking collection "${collectionName}":`, err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET route to return all lessons
app.get("/lessons", async (req, res) => {
  try {
    const lessons = await db1.collection("lessons").find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error("Error fetching lessons:", err.message);
    res.status(500).json({ error: "Failed to fetch lessons." });
  }
});

// POST route to save a new order in the "orders" collection
app.post("/orders", async (req, res) => {
  try {
    const order = req.body;
    // Validate the order payload
    if (!order.name || !order.phone || !order.lessonIDs || !order.spaces) {
      return res.status(400).json({ error: "Invalid order format." });
    }
    const orderCollection = db1.collection("orders");
    const result = await orderCollection.insertOne(order);
    res.json({ message: "Order created successfully.", result });
  } catch (err) {
    console.error("Error creating order:", err.message);
    res.status(500).json({ error: "Failed to create order." });
  }
});

// PUT route to update any attribute of a lesson in the "lessons" collection
app.put("/lessons/:id", async (req, res) => {
  try {
    const lessonId = new ObjectId(req.params.id);
    const updatedLesson = req.body;
    const result = await db1
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

// Error Handling Middleware: Handles all uncaught errors
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "An internal error occurred." });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
