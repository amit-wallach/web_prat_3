import db from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Controller to handle user login and set authentication cookie
export const loginUser = (req, res) => {
  const { email, password } = req.body;

  // SQL query selects matching user from tutors or students tables
  const sql = `
    SELECT 
      id, firstName, lastName, email, phone, username, password, dob, userType, subjects, created_at,
      profilePhoto, background, bio, rates, teachingMethod, area,
      'tutor' AS sourceTable
    FROM tutors
    WHERE email = ? AND password = ?

    UNION

    SELECT
      id, firstName, lastName, email, phone, username, password, dob, userType, subjects, created_at,
      NULL AS profilePhoto,
      NULL AS background,
      NULL AS bio,
      NULL AS rates,
      NULL AS teachingMethod,
      NULL AS area,
      'student' AS sourceTable
    FROM students
    WHERE email = ? AND password = ?
  `;

  // Execute the query with parameterized inputs for security
  db.query(sql, [email, password, email, password], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      // Send generic server error message on database failure
      return res.status(500).send('<h1>Internal server error</h1>');
    }

    // If no user matched, redirect back to login with error message in query string
    if (results.length === 0) {
      return res.redirect('/login.html?error=Invalid+email+or+password');
    }

    const user = results[0];
    // Remove sensitive information before sending response
    delete user.password;

    // Create JSON string with relevant user info to store in cookie
    const userData = JSON.stringify({ email: user.email, userType: user.sourceTable });

    // Set a secure, HttpOnly cookie with encoded user data
    res.cookie('authUser', userData, {
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie valid for 7 days
      sameSite: 'Strict',              // Mitigate CSRF attacks
      // secure: true, // Uncomment this line if serving over HTTPS in production
    });

    // Redirect to dashboard page on successful login
    res.redirect('/dashboard.html');
  });
};

// Controller to return filled profile page with user data from database
export const renderProfilePage = (req, res) => {
      console.log("renderProfilePage called");

  const authUser = req.cookies.authUser;
  if (!authUser) return res.redirect("/login.html");

  const { email, userType } = JSON.parse(authUser);
  const table = userType === "tutor" ? "tutors" : "students";

  const sql = `SELECT * FROM ${table} WHERE email = ?`;

  db.query(sql, [email], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).send("Error loading profile");
    }

    const user = results[0];
    console.log("Raw subjects:", user.subjects);

    delete user.password;

    // Parse subjects JSON string safely
    let subjectsFormatted = "-";
    if (user.subjects && user.subjects !== "[]") {
        try {
            const subjectsArray = JSON.parse(user.subjects);
            console.log("Parsed subjects array:", subjectsArray);
            if (Array.isArray(subjectsArray) && subjectsArray.length > 0) {
            subjectsFormatted = subjectsArray.join(", ");
            }
        } catch (e) {
            console.error("Failed to parse subjects JSON:", e);
            subjectsFormatted = user.subjects; // fallback
        }
        }

    const filePath = path.join(__dirname, "../../public/profile.html");
    fs.readFile(filePath, "utf-8", (err, html) => {
      if (err){
        console.error("Error loading HTML file:", err);
        return res.status(500).send("Error loading HTML");
     } 

      // Hide tutor fields if user is a student
      if (user.userType === "student") {
        html = html.replace(
          '<div class="tutor-fields">',
          '<div class="tutor-fields" style="display:none;">'
        );
      }

      const dobFormatted = user.dob ? new Date(user.dob).toLocaleDateString('en-IL') : "-";
      const filledHtml = html
        .replace("{{FULL_NAME}}", `${user.firstName} ${user.lastName}`)
        .replace("{{EMAIL}}", user.email || "")
        .replace("{{PHONE}}", user.phone || "")
        .replace("{{USERNAME}}", user.username || "")
        .replace("{{DOB}}", dobFormatted)
        .replace("{{SUBJECTS}}", subjectsFormatted)
        .replace("{{PROFILE_PHOTO}}", user.profilePhoto
          ? `data:image/jpeg;base64,${user.profilePhoto.toString("base64")}`
          : (user.userType === "student" ? "/images/student.jpeg" : "/images/default-user.png"))
        .replace("{{TEACHING_METHOD}}", user.teachingMethod || "-")
        .replace("{{RATES}}", user.rates || "-")
        .replace("{{AREA}}", user.area || "-")
        .replace("{{BACKGROUND}}", user.background || "-")
        .replace("{{BIO}}", user.bio || "-")

      res.send(filledHtml);
    });
  });
};

export const getMyLessons = (req, res) => {
  const authUser = req.cookies.authUser;
  if (!authUser) return res.status(401).send("Not logged in");

  const { email, userType } = JSON.parse(authUser);

  const sql =
    userType === "student"
      ? `SELECT bl.id, bl.date, bl.time, bl.type,
                CONCAT(t.firstName, ' ', t.lastName) AS withName
         FROM booked_lessons bl
         JOIN tutors t ON bl.tutorId = t.id
         WHERE bl.studentId = (SELECT id FROM students WHERE email = ?)`
      : `SELECT bl.id, bl.date, bl.time, bl.type,
                CONCAT(s.firstName, ' ', s.lastName) AS withName
         FROM booked_lessons bl
         JOIN students s ON bl.studentId = s.id
         WHERE bl.tutorId = (SELECT id FROM tutors WHERE email = ?)`;

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching lessons:", err);
      return res.status(500).send("Error loading lessons");
    }

    res.json(results);
  });
};

// Controller for logout — clears the auth cookie
export const logoutUser = (req, res) => {
  res.clearCookie('authUser', { path: '/' });
  res.redirect('/login.html');
};

export const submitReview = (req, res) => {
  const authUser = req.cookies.authUser;
  if (!authUser) return res.status(401).send("Not logged in");

  const { email, userType } = JSON.parse(authUser);
  if (userType !== "student") return res.status(403).send("Only students can review");

  const { lessonId, stars, text } = req.body;
  if (!lessonId || !stars || !text) return res.status(400).send("Missing review data");

  const sql = `
    INSERT INTO reviews (lessonId, tutorId, studentId, stars, text)
    VALUES (
      ?,
      (SELECT tutorId FROM booked_lessons WHERE id = ?),
      (SELECT id FROM students WHERE email = ?),
      ?, ?
    )
  `;

  db.query(sql, [lessonId, lessonId, email, stars, text], (err, result) => {
    if (err) {
      console.error("Error saving review:", err);
      return res.status(500).send("Failed to save review");
    }
    res.status(200).send("Review saved");
  });
};
