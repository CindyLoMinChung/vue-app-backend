// Declaration of dependencies
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // Declare mongodb
const PropertiesReader = require("properties-reader");

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.set("json spaces", 3); // To pretify JSON format during debug

// Load properties from the file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Logger Middleware: Logs all requests
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} request to ${req.url}`
  );
  next();
});

// Extract values from the properties file
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// MongoDB Connection URI
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
console.log(`MongoDB Connection URI: ${uri}`);

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Declare `db` variable
let db;

// Consolidated Function to Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    db = client.db(dbName); // Initialize `db` with your database name
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // Exit process on failure
  }
}

// Ensure database connection is established
connectDB().then(async () => {
  console.log("Collections:", await db.listCollections().toArray());
  updateLessonImages(); // Only call once the connection is established
});

// Serve the "Images" folder
app.use("/images", express.static(path.join(__dirname, "Images")));

app.get("/test-images", (req, res) => {
  res.json({ message: "Static file serving configured" });
});

// Function to update lesson images
async function updateLessonImages() {
  try {
    const lessonsCollection = db.collection("lessons");
    const lessons = await lessonsCollection.find({}).toArray();
    for (let lesson of lessons) {
      const updatedImage = `https://vue-app-backend.onrender.com/images/${lesson.subject}.jpeg`;
      await lessonsCollection.updateOne(
        { _id: lesson._id },
        { $set: { image: updatedImage } }
      );
    }
    console.log("Lesson images updated successfully!");
  } catch (error) {
    console.error("Error updating images:", error);
  }
}

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

app.get("/test-images", (req, res) => {
  const fs = require("fs");
  const imagePath = path.join(__dirname, "Images");
  fs.readdir(imagePath, (err, files) => {
    if (err) {
      console.error("Error reading Images directory:", err.message);
      return res
        .status(500)
        .json({ error: "Images folder not found or inaccessible" });
    }
    res.json({ images: files });
  });
});

// POST route to save a new order
app.post("/order", async (req, res) => {
  const { name, phone, address, lessons } = req.body;

  // Validate the request body
  if (!name || !phone || !address || !Array.isArray(lessons)) {
    return res.status(400).json({ error: "Invalid order format." });
  }

  try {
    // Save the order to the "orders" collection
    const order = { name, phone, address, lessons, date: new Date() };
    const result = await db.collection("orders").insertOne(order);

    res.status(201).json({
      message: "Order placed successfully.",
      orderId: result.insertedId, // Send order ID for client reference
    });
  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).json({ error: "Failed to save the order." }); // Inform client of the failure
  }
});

// Update an order by ID
app.put("/order/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract the order ID from the URL
    const { name, phone, address, lessons } = req.body; // Get updated fields from the request body

    // Validate input
    if (!name || !phone || !address || !lessons || !Array.isArray(lessons)) {
      return res
        .status(400)
        .json({ error: "Invalid order data. Ensure all fields are provided." });
    }

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(id) }, // Match the order by its ID
      { $set: { name, phone, address, lessons, date: new Date() } } // Update fields
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: "Order not found." });
    } else {
      res.status(200).json({ message: "Order updated successfully." });
    }
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update the order." });
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
