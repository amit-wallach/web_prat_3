// Import the database connection
import db from '../db.js';

/**
 * Controller: Handles tutor registration
 * Route: POST /register-tutor
 */
export const registerTutor = (req, res) => {
  console.log("Received POST /register-tutor");

  const {
    firstName,
    lastName,
    email,
    phone,
    username,
    password,
    dob,
    userType,
    background,
    bio,
    rates,
    teachingMethod,
    area
  } = req.body;

  let subjectsArray = req.body.subjects || req.body["subjects[]"];
  if (!subjectsArray) subjectsArray = [];
  else if (!Array.isArray(subjectsArray)) subjectsArray = [subjectsArray];
  const subjects = JSON.stringify(subjectsArray);
  const profilePhoto = req.file?.buffer || null;

  // === Check uniqueness of email, phone, and username across both tutors and students ===
  const checkEmailSql = `
    SELECT 'email' AS field FROM students WHERE email = ?
    UNION
    SELECT 'email' AS field FROM tutors WHERE email = ?
  `;

  const checkPhoneSql = `
    SELECT 'phone' AS field FROM students WHERE phone = ?
    UNION
    SELECT 'phone' AS field FROM tutors WHERE phone = ?
  `;

  const checkUsernameSql = `
    SELECT 'username' AS field FROM students WHERE username = ?
    UNION
    SELECT 'username' AS field FROM tutors WHERE username = ?
  `;

  db.query(checkEmailSql, [email, email], (err, emailResult) => {
    if (err) return res.status(500).send("Server error");
    if (emailResult.length > 0) return res.status(400).send("Email already exists");

    db.query(checkPhoneSql, [phone, phone], (err, phoneResult) => {
      if (err) return res.status(500).send("Server error");
      if (phoneResult.length > 0) return res.status(400).send("Phone number already exists");

      db.query(checkUsernameSql, [username, username], (err, userResult) => {
        if (err) return res.status(500).send("Server error");
        if (userResult.length > 0) return res.status(400).send("Username already exists");

        // ✅ All unique – proceed to insert tutor
        const sql = `
          INSERT INTO tutors (
            firstName, lastName, email, phone, username, password, dob, userType,
            subjects, profilePhoto, background, bio, rates, teachingMethod, area
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          subjects,
          profilePhoto,
          background,
          bio,
          rates,
          teachingMethod,
          area
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.error("Failed to insert tutor:", err);
            return res.status(500).send("Error registering tutor");
          }

          console.log("Tutor registered successfully");
          res.redirect('/login.html');
        });
      });
    });
  });
};



export const searchTutors = (req, res) => {
  const { subject, location, price, lessonType, ratings } = req.query;

  let query = `
    SELECT tutors.*, 
           IFNULL(AVG(reviews.stars), 0) AS avgRating, 
           COUNT(reviews.stars) AS reviewCount,
           JSON_ARRAYAGG(reviews.stars) AS ratings
    FROM tutors
    LEFT JOIN reviews ON tutors.id = reviews.tutorId
    WHERE 1=1
  `;

  const params = [];

  if (subject) {
    query += " AND LOWER(subjects) LIKE ?";
    params.push(`%${subject.toLowerCase()}%`);
  }
  if (location) {
    query += " AND LOWER(area) LIKE ?";
    params.push(`%${location.toLowerCase()}%`);
  }
  if (price) {
    query += " AND rates <= ?";
    params.push(price);
  }
  if (lessonType) {
    query += " AND teachingMethod = ?";
    params.push(lessonType);
  }

  query += " GROUP BY tutors.id";

  if (ratings) {
    query += " HAVING avgRating >= ?";
    params.push(ratings);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Search error:", err);
      return res.status(500).json({ error: "Failed to fetch tutors" });
    }

    results.forEach((tutor) => {
      try {
        tutor.subjects = JSON.parse(tutor.subjects || "[]");
      } catch {
        tutor.subjects = [];
      }

      try {
        tutor.ratings = JSON.parse(tutor.ratings || "[]");
        tutor.avgRating = parseFloat(tutor.avgRating);
      } catch {
        tutor.ratings = [];
        tutor.avgRating = 0;
      }

      if (tutor.profilePhoto && typeof tutor.profilePhoto === 'object' && typeof tutor.profilePhoto.length === 'number') {
        tutor.profilePhoto = {
          data: Array.from(tutor.profilePhoto)
        };
      } else {
        tutor.profilePhoto = null;
      }
    });

    res.json(results);
  });
};

/**
 * Controller: Save weekly availability for a tutor using email from cookie
 */
export const saveAvailability = (req, res) => {
  const authUser = req.cookies.authUser;
  if (!authUser) return res.status(401).send("No auth cookie found");

  const { email, userType } = JSON.parse(authUser);
  if (userType !== "tutor") return res.status(403).send("Only tutors can set availability");

  const findTutorQuery = "SELECT id FROM tutors WHERE email = ?";
  db.query(findTutorQuery, [email], (err, results) => {
    if (err || results.length === 0) {
      console.error("Failed to find tutor:", err);
      return res.status(500).send("Tutor not found");
    }

    const tutorId = results[0].id;

    let slots;
    try {
      slots = JSON.parse(req.body.slots);
    } catch (err) {
      console.error("Invalid slots JSON:", err);
      return res.status(400).send("Invalid slot data");
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).send("No slots provided");
    }

    const insertSql = `
      INSERT INTO availability (tutorId, day, date, time, type)
      VALUES ?
    `;
    const values = slots.map(slot => [
      tutorId,
      slot.day,
      slot.date,
      slot.time,
      slot.type
    ]);

    db.query(insertSql, [values], (err, result) => {
      if (err) {
        console.error("DB error inserting slots:", err);
        return res.status(500).send("Could not save availability");
      }

      console.log("Saved", result.affectedRows, "availability slots");
      res.status(200).send("Availability saved successfully");
    });
  });
};

export const getMyAvailability = (req, res) => {
  const authUser = req.cookies.authUser;
  if (!authUser) return res.status(401).send("Unauthorized");

  const { email, userType } = JSON.parse(authUser);
  if (userType !== "tutor") return res.status(403).send("Forbidden");

  const sqlDeleteOld = `
    DELETE FROM availability
    WHERE tutorId = (SELECT id FROM tutors WHERE email = ?)
      AND date < CURDATE()
  `;

  db.query(sqlDeleteOld, [email], (delErr) => {
    if (delErr) {
      console.error("Failed to delete old slots:", delErr);
      return res.status(500).send("Error cleaning old slots");
    }

    const sqlFetchUpcoming = `
      SELECT id, day, date, time, type
      FROM availability
      WHERE tutorId = (SELECT id FROM tutors WHERE email = ?)
        AND date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY date, time
    `;

    db.query(sqlFetchUpcoming, [email], (err, results) => {
      if (err) {
        console.error("Failed to fetch availability:", err);
        return res.status(500).send("Error fetching availability");
      }

      res.json(results);
    });
  });
};

export const deleteAvailability = (req, res) => {
  const authUser = req.cookies.authUser;
  if (!authUser) return res.status(401).send("Unauthorized");

  const { email } = JSON.parse(authUser);
  const id = req.params.id;

  const sql = `
    DELETE FROM availability
    WHERE id = ?
    AND tutorId = (SELECT id FROM tutors WHERE email = ?)
  `;

  db.query(sql, [id, email], (err, result) => {
    if (err) {
      console.error("Failed to delete slot:", err);
      return res.status(500).send("Error deleting slot");
    }

    if (result.affectedRows === 0) {
      return res.status(403).send("Slot not found or not yours");
    }

    res.status(200).send("Slot deleted");
  });
};

export const getTutorByUsername = (req, res) => {
  const username = req.params.username;

  const sql = "SELECT * FROM tutors WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Tutor not found" });
    }

    const tutor = results[0];

    // Parse subjects and ratings
    try {
      tutor.subjects = JSON.parse(tutor.subjects || "[]");
    } catch {
      tutor.subjects = [];
    }

    try {
      tutor.ratings = JSON.parse(tutor.ratings || "[]");
    } catch {
      tutor.ratings = [];
    }

    const getReviewsSql = `
      SELECT r.stars, r.text, r.created_at, s.firstName AS studentName
      FROM reviews r
      JOIN students s ON r.studentId = s.id
      WHERE r.tutorId = ?
      ORDER BY r.created_at DESC
    `;

    db.query(getReviewsSql, [tutor.id], (err, reviews) => {
      if (err) {
        console.error("Failed to fetch reviews:", err);
        tutor.reviews = [];
      } else {
        tutor.reviews = reviews.map(r => ({
          stars:  r.stars,
          text: r.text,
          date: r.created_at.toISOString().split("T")[0],
          name: r.studentName
        }));
      }

      res.json(tutor);
    });
  });
};

export const getAvailabilityByUsername = (req, res) => {
  const username = req.params.username;

  const sql = `
    SELECT a.id, a.day, a.date, a.time, a.type
    FROM availability a
    JOIN tutors t ON a.tutorId = t.id
    WHERE t.username = ?
      AND (
        a.date > CURDATE()
        OR (a.date = CURDATE() AND a.time > CURTIME())
      )
    ORDER BY a.date, a.time

  `;

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Error fetching availability by username:", err);
      return res.status(500).send("DB error");
    }

    res.json(results);
  });
};

export const bookLesson = (req, res) => {
  const authUser = req.cookies.authUser;
  if (!authUser) return res.status(401).send("You must be logged in to book a lesson.");

  const { email, userType } = JSON.parse(authUser);
  if (userType !== "student") return res.status(403).send("Only students can book");

  let { tutorUsername, date, time, type } = req.body;
  if (!tutorUsername || !date || !time || !type) {
    return res.status(400).send("Missing fields");
  }

  // Ensure date is in YYYY-MM-DD format
  if (date.includes("T")) {
    date = date.split("T")[0];
  }

  const getIdsSql = `
    SELECT 
      (SELECT id FROM tutors WHERE username = ?) AS tutorId,
      (SELECT id FROM students WHERE email = ?) AS studentId
  `;

  db.query(getIdsSql, [tutorUsername, email], (err, results) => {
    if (err) {
      console.error("ID lookup error:", err);
      return res.status(500).send("Server error");
    }

    const { tutorId, studentId } = results[0];
    if (!tutorId || !studentId) return res.status(404).send("User not found");

    const insertSql = `
      INSERT INTO booked_lessons (tutorId, studentId, date, time, type)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [tutorId, studentId, date, time, type], (err, result) => {
      if (err) {
        console.error("Booking error:", err);
        return res.status(500).send("Failed to book lesson");
      }

      const deleteSql = `
        DELETE FROM availability
        WHERE tutorId = ? AND date = ? AND time = ? AND type = ?
      `;

      console.log("Trying to delete availability with:", {
        tutorId,
        date,
        time,
        type
      });

      db.query(deleteSql, [tutorId, date, time, type], (err, delResult) => {
        if (err) {
          console.error("Failed to remove availability:", err);
          return res.status(500).send("Lesson booked, but availability not removed");
        }

        if (delResult.affectedRows === 0) {
          console.warn("No availability was removed – check matching date/time/type");
        }

        res.status(200).send("Lesson booked and availability removed");
      });
    });
  });
};
