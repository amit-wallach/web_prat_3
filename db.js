import mysql from 'mysql2'; // Import the mysql2 library to work with MySQL databases
import { dbConfig } from './db.config.js'; // Import database connection settings from external config file

// Create a connection to the MySQL database using the provided settings
const connection = mysql.createConnection({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
});

// Connect to the database and handle any errors
connection.connect((err) => {
  if (err) {
    // Print error message if connection fails
    console.error(' Error connecting to the database:', err);
    return;
  }
    // Print success message if connection is established
    console.log('Connected to MySQL database');
});

// Export the connection so other files can use it to run queries
export default connection;
