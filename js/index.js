// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Check if request is made by an existing admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to grant admin access.');
  }
  
  const email = data.email;
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Success! ${email} has been made an admin.` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Secure write operations
exports.createEntry = functions.https.onCall(async (data, context) => {
  // Verify admin status
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to create entries.');
  }
  
  const { title, description, link, contentType, access, imageUrl } = data;
  
  // Validate data
  if (!title || !description || !link) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  try {
    const entry = {
      title,
      description,
      link,
      contentType,
      access,
      imageUrl,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      day: calculateDayNumber(), // Your logic here
      status: 'published',
      hearts: 0
    };
    
    const docRef = await admin.firestore()
      .collection(`artifacts/${process.env.PROJECT_ID}/public/data/drops`)
      .add(entry);
      
    return { id: docRef.id, message: 'Entry created successfully' };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
