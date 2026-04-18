const mongoose = require('mongoose');

async function dropIndex() {
  await mongoose.connect('mongodb://localhost:27017/test'); // local DB
  console.log('Connected');

  try {
    await mongoose.connection.collection('users').dropIndex('username_1');
    console.log('✅ Done! Index dropped');
  } catch (err) {
    if (err.code === 27) {
      console.log('ℹ️ Index already gone');
    } else {
      console.error('❌ Error:', err.message);
    }
  }

  await mongoose.disconnect();
}

dropIndex();