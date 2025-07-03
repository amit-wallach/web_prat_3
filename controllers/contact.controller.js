import db from '../db.js'; // Import the database connection to run SQL queries

//Controller to save a contact message into the database
export const saveContactMessage = (req, res) => {
  const { name, email, message } = req.body;

  // Validate: make sure all fields are filled
  if (!name || !email || !message) {
    return res.status(400).send("All fields are required.");
  }

  // Validate: check if the email is in a proper format - we add that double check becouse we wantes to make sure that we can go back to the customer 
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send("Invalid email format.");
  }

  // Prepare the SQL query to insert the message
  const sql = "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)";
  const values = [name, email, message];

  // Execute the query
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error saving contact message:", err);
      return res.status(500).send("Server error: could not save message.");
    }

    console.log("Contact message saved to database.");
    res.sendStatus(200); // Just end the request with a 200 OK
  });
};
