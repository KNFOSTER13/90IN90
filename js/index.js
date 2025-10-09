const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Sets a custom claim on a user account to grant admin privileges.
 * Only an existing admin can call this function.
 */
exports.setAdmin = functions.https.onCall(async (data, context) => {
    // 1. Check if the user calling the function is already an admin.
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to grant admin rights.');
    }

    const email = data.email;
    try {
        // 2. Get the user by email and set the custom claim.
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        return { message: `Success! ${email} has been made an admin.` };
    } catch (error) {
        console.error('Error setting admin claim:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while setting the admin claim.');
    }
});

/**
 * Creates a new entry in the 'drops' collection.
 * This function is protected and can only be called by authenticated admins.
 */
exports.createEntry = functions.https.onCall(async (data, context) => {
    // 1. Check if the user is an admin.
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to create an entry.');
    }

    // 2. Validate the incoming data.
    const { title, description, link, contentType, access, imageUrl, status, scheduledFor } = data;
    if (!title || !description || !link) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    // 3. Prepare the data for Firestore.
    const entryData = {
        title,
        description,
        link,
        contentType,
        access,
        imageUrl: imageUrl || null,
        status: status || 'published',
        hearts: 0,
        day: new Date().getDate(), // You might want more robust day calculation logic
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if(status === 'scheduled' && scheduledFor) {
        entryData.scheduledFor = scheduledFor;
    }


    // 4. Add the new entry to Firestore.
    try {
        const dropsCollectionPath = `artifacts/${process.env.GCLOUD_PROJECT}/public/data/drops`;
        const docRef = await admin.firestore().collection(dropsCollectionPath).add(entryData);
        return { success: true, message: 'Entry created successfully!', id: docRef.id };
    } catch (error) {
        console.error('Error creating entry:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create entry.');
    }
});
