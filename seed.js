import db from './db.js';
import fs from 'fs';

export function insertDemoTutorsIfNeeded() {
  db.query('SELECT COUNT(*) as cnt FROM tutors', (err, results) => {
    if (err) {
      console.error('Error checking tutors count:', err);
      return;
    }
    if (results[0].cnt === 0) {
      const demoTutors = [
        [
          'Amit', 'Wallach', 'amitwallach@gmail.com', '0524555397', 'amitwallach', '123456',
          '1997-08-15', 'tutor', JSON.stringify(["Math"]),
          fs.readFileSync('./seed_uplode/amit.jpg'),
          'BSc in Mathematics and Computer Science, Tel Aviv University. 3 years private tutoring experience.',
          'Friendly and passionate about helping every student reach their full math potential. Available for both online and in-person lessons.',
          '90', 'online', 'Tel Aviv & central area', new Date(), '[]'
        ],
        [
          'Noa', 'Bar', 'noa.bar@gmail.com', '0541234567', 'noabar', 'noaScience23',
          '1992-04-12', 'tutor', JSON.stringify(["Science", "Math"]),
          fs.readFileSync('./seed_uplode/shoval.jpg'),
          'MSc in Biology, expert in genetics and high school science. 5 years experience.',
          'Motivated to inspire curiosity and understanding in young learners!',
          '110', 'in person', 'Ramat Gan', new Date(), '[]'
        ],
        [
          'Dana', 'Levi', 'danalevi@gmail.com', '0528889988', 'danal', 'danaMaths90',
          '1987-10-27', 'tutor', JSON.stringify(["Math", "English"]),
          fs.readFileSync('./seed_uplode/noa.jpg'),
          'BA in Mathematics Education. Over 10 years teaching all levels.',
          'Patient, creative, and makes learning fun for every student.',
          '130', 'online', 'Haifa', new Date(), '[]'
        ]
      ];

      const sql = `INSERT INTO tutors
        (firstName, lastName, email, phone, username, password, dob, userType, subjects, profilePhoto, background, bio, rates, teachingMethod, area, created_at, ratings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      demoTutors.forEach((tutor, idx) => {
        db.query(sql, tutor, (err2, result) => {
          if (err2) {
            console.error(`Error inserting tutor #${idx+1}:`, err2);
          } else {
            console.log(`Demo tutor #${idx+1} inserted!`);
          }
        });
      });
    } else {
      console.log('Demo tutors already exist, skipping demo insert.');
    }
  });
}


export function insertDemoStudentsIfNeeded() {
  db.query('SELECT COUNT(*) as cnt FROM students', (err, results) => {
    if (err) {
      console.error('Error checking students count:', err);
      return;
    }
    if (results[0].cnt === 0) {
      const demoStudents = [
        [
          'Tom',           
          'Shalev',        
          'tom@gmail.com', 
          '0543219876',   
          'tomshalev',     
          '123456',     
          '2002-02-16',    
          'student',       
          JSON.stringify(["Math", "English"]), 
          new Date()       
        ],
        [
          'Yasmin', 
          'Cohen', 
          'yasmin.cohen@gmail.com', 
          '0505678987', 
          'yasminco', 
          'yasminbest', 
          '2001-06-24', 
          'student', 
          JSON.stringify(["Science"]), 
          new Date()
        ]
      ];

      const sql = `INSERT INTO students
        (firstName, lastName, email, phone, username, password, dob, userType, subjects, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      demoStudents.forEach((student, idx) => {
        db.query(sql, student, (err2, result) => {
          if (err2) {
            console.error(`Error inserting student #${idx+1}:`, err2);
          } else {
            console.log(`Demo student #${idx+1} inserted!`);
          }
        });
      });
    } else {
      console.log('Demo students already exist, skipping demo insert.');
    }
  });
}


// Insert demo availabilities for all tutors if table is empty
export function insertDemoAvailabilityIfNeeded() {
  // Check if there are already availabilities in the table
  db.query('SELECT COUNT(*) as cnt FROM availability', (err, results) => {
    if (err) {
      console.error('Error checking availability count:', err);
      return;
    }
    // Only insert demo data if table is empty
    if (results[0].cnt === 0) {
      // Get all tutors' IDs from the tutors table
      db.query('SELECT id FROM tutors', (err2, tutors) => {
        if (err2 || tutors.length === 0) {
          console.error('Error getting tutors:', err2 || 'No tutors found!');
          return;
        }
        // Define demo days and types for the availabilities
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        const types = ['online', 'in person'];

        tutors.forEach((tutor, idx) => {
          // Each tutor will get 2 demo availability slots
          const slots = [
            [
              tutor.id,                        // tutorId
              days[(idx * 2) % days.length],   // day (rotating from the days array)
              formatDate(addDays(new Date(), idx)), // date (today + idx days)
              '16:00:00',                      // time
              types[idx % types.length]         // type (online/in person)
            ],
            [
              tutor.id,
              days[(idx * 2 + 1) % days.length],
              formatDate(addDays(new Date(), idx + 1)),
              '18:00:00',
              types[(idx + 1) % types.length]
            ]
          ];

          const sql = `INSERT INTO availability (tutorId, day, date, time, type) VALUES (?, ?, ?, ?, ?)`;

          // Insert each slot for the tutor
          slots.forEach((slot) => {
            db.query(sql, slot, (err3, result) => {
              if (err3) {
                console.error(`Error inserting availability for tutorId ${tutor.id}:`, err3);
              } else {
                console.log(`Inserted availability for tutorId ${tutor.id}`);
              }
            });
          });
        });
      });
    } else {
      console.log('Demo availabilities already exist, skipping demo insert.');
    }
  });
}

// Utility: add N days to a given date object and return the new date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Utility: format a date as 'YYYY-MM-DD'
function formatDate(date) {
  return date.toISOString().split('T')[0];
}


// Insert demo booked lessons for every tutor-student pair (past & future)
export function insertDemoBookedLessonsIfNeeded() {
  db.query('SELECT COUNT(*) as cnt FROM booked_lessons', (err, results) => {
    if (err) {
      console.error('Error checking booked_lessons count:', err);
      return;
    }
    if (results[0].cnt === 0) {
      db.query('SELECT id FROM students', (err1, students) => {
        db.query('SELECT id, rates FROM tutors', (err2, tutors) => {
          if (err1 || err2 || students.length === 0 || tutors.length === 0) {
            console.error('Error fetching demo students/tutors:', err1 || err2);
            return;
          }

          const sql = `INSERT INTO booked_lessons
            (tutorId, studentId, date, time, type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

          let insertsCount = 0;
          const totalInserts = students.length * tutors.length * 2; // past + future lessons

          students.forEach((student, sIdx) => {
            tutors.forEach((tutor, tIdx) => {
              // Past lesson
              const pastLesson = [
                tutor.id,
                student.id,
                addDaysFormatted(new Date(), -7 - sIdx - tIdx),
                '14:00:00',
                'in person',
                'completed',
                new Date()
              ];
              db.query(sql, pastLesson, (err3) => {
                if (err3) {
                  console.error(`Error inserting past lesson (student ${student.id}, tutor ${tutor.id}):`, err3);
                } else {
                  insertsCount++;
                  if (insertsCount === totalInserts) {
                    insertDemoReviewsIfNeeded(); 
                  }
                }
              });

              // Future lesson
              const futureLesson = [
                tutor.id,
                student.id,
                addDaysFormatted(new Date(), 2 + sIdx + tIdx),
                '16:00:00',
                'online',
                'upcoming',
                new Date()
              ];
              db.query(sql, futureLesson, (err4) => {
                if (err4) {
                  console.error(`Error inserting future lesson (student ${student.id}, tutor ${tutor.id}):`, err4);
                } else {
                  insertsCount++;
                  if (insertsCount === totalInserts) {
                    insertDemoReviewsIfNeeded(); 
                  }
                }
              });
            });
          });
        });
      });
    } else {
      console.log('Demo booked lessons already exist, skipping demo insert.');
      insertDemoReviewsIfNeeded(); 
    }
  });
}

// Utility: add N days (can be negative) and return as YYYY-MM-DD
function addDaysFormatted(date, days = 1) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}


function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

export async function insertDemoReviewsIfNeeded() {
  try {
    const count = await queryAsync('SELECT COUNT(*) as cnt FROM reviews');
    if (count[0].cnt > 0) {
      console.log('Reviews already exist, skipping insert.');
      return;
    }

    const lessons = await queryAsync('SELECT id, tutorId, studentId FROM booked_lessons WHERE status = "completed"');
    if (lessons.length === 0) {
      console.log('No lessons found to insert reviews.');
      return;
    }

    const demoReviews = [
      "Amazing tutor! Very clear explanations and super patient.",
      "Good experience, helped me understand difficult topics.",
      "Great teacher! Highly recommended.",
      "Very helpful and friendly.",
      "Excellent explanations and support."
    ];

    const demoStars = [5, 4, 5, 5, 4];
    const sql = `INSERT INTO reviews (lessonId, tutorId, studentId, stars, text, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const reviewText = demoReviews[i % demoReviews.length];
      const stars = demoStars[i % demoStars.length];

      await queryAsync(sql, [lesson.id, lesson.tutorId, lesson.studentId, stars, reviewText, new Date()]);
      console.log(`Inserted review for lesson ${lesson.id}`);
    }
  } catch (err) {
    console.error('Error inserting fake reviews:', err);
  }
}