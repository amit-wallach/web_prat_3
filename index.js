import express from 'express'; // Import the express module to create the server
import path from 'path'; // Import path module to work with file and directory paths
import { fileURLToPath } from 'url'; // Required to get __filename in ES modules 
import { dirname } from 'path'; // Required to get __dirname in ES modules (type: "module")
import db from './db.js'; // Import the MySQL database connection object to perform SQL queries
import contactRoutes from './routes/contact.routes.js'; // Import the contact form route
import bodyParser from 'body-parser'; // To parse incoming form data
import tutorRoutes from './routes/tutor.routes.js'; // Import the tutor-related routes
import studentRoutes from './routes/student.routes.js'; // Student registration route
import cookieParser from 'cookie-parser'; // Middleware to parse cookies
import authRoutes from './routes/auth.routes.js'; // Handles authentication routes like login, logout, profile
import {
   insertDemoTutorsIfNeeded,
   insertDemoStudentsIfNeeded,
   insertDemoAvailabilityIfNeeded,
   insertDemoBookedLessonsIfNeeded,

 } from './seed.js';


const app = express(); // Create an instance of an Express application - this is the server
const port = 8000; // Define the port the server will listen on

const __filename = fileURLToPath(import.meta.url); // Get the absolute path to the current file
const __dirname = dirname(__filename); // Get the directory name of the current file

const publicPath = path.join(__dirname, '../public'); // Define the path to the 'public' folder located outside the server folder - the client side

app.use(express.static(publicPath)); // Serve static files (HTML, CSS, JS, images) from the public folder
app.use(cookieParser()); // Middleware to parse cookies from incoming requests
app.use(bodyParser.json()); // Parse JSON data
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data (x-www-form-urlencoded)
app.use(contactRoutes); // Use the contact route for form submission
app.use(tutorRoutes); // This allows the server to respond to requests like POST /register-tutor
app.use(studentRoutes); // Activate /register-student endpoint
app.use(authRoutes);

insertDemoTutorsIfNeeded();
insertDemoStudentsIfNeeded();
insertDemoAvailabilityIfNeeded();
insertDemoBookedLessonsIfNeeded();

// Define a route for the home page ('/') that sends home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'home.html'));
});


// Start the server and listen on the defined port
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});



