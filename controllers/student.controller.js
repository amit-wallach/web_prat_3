// Import the database connection
import db from '../db.js';

/**
 * Controller: Handles student registration
 * Route: POST /register-student
 */
export const registerStudent = (req, res) => {
  console.log("Received POST /register-student");

  const {
    firstName,
    lastName,
    email,
    phone,
    username,
    password,
    dob,
    userType
  } = req.body;

  let subjectsArray = req.body.subjects || req.body["subjects[]"];
  if (!subjectsArray) subjectsArray = [];
  else if (!Array.isArray(subjectsArray)) subjectsArray = [subjectsArray];

  const subjects = JSON.stringify(subjectsArray);

  // === Step 1: Check if email already exists ===
  const checkEmailSql = `
    SELECT 'email' AS field FROM students WHERE email = ?
    UNION
    SELECT 'email' AS field FROM tutors WHERE email = ?
  `;

  db.query(checkEmailSql, [email, email], (err, emailResult) => {
    if (err) return res.status(500).send("Server error");
    if (emailResult.length > 0) return res.status(400).send("Email already exists");

    // === Step 2: Check phone ===
    const checkPhoneSql = `
      SELECT 'phone' AS field FROM students WHERE phone = ?
      UNION
      SELECT 'phone' AS field FROM tutors WHERE phone = ?
    `;

    db.query(checkPhoneSql, [phone, phone], (err, phoneResult) => {
      if (err) return res.status(500).send("Server error");
      if (phoneResult.length > 0) return res.status(400).send("Phone number already exists");

      // === Step 3: Check username ===
      const checkUsernameSql = `
        SELECT 'username' AS field FROM students WHERE username = ?
        UNION
        SELECT 'username' AS field FROM tutors WHERE username = ?
      `;

      db.query(checkUsernameSql, [username, username], (err, userResult) => {
        if (err) return res.status(500).send("Server error");
        if (userResult.length > 0) return res.status(400).send("Username already exists");

        // === Step 4: Insert student ===
        const insertQuery = `
          INSERT INTO students (
            firstName, lastName, email, phone,
            username, password, dob, userType, subjects
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          firstName,
          lastName,
          email,
          phone,
          username,
          password,
          dob || null,
          userType,
          subjects
        ];

        db.query(insertQuery, values, (err, result) => {
          if (err) {
            console.error("Failed to insert student:", err);
            return res.status(500).send("Failed to register student.");
          }

          console.log("Student registered successfully.");
      res.redirect('/login.html');
    });
  });
  });
  });
};
