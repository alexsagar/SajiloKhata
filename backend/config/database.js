const mongoose = require("mongoose")

// In test environment, disable command buffering so model operations fail fast
if (process.env.NODE_ENV === 'test') {
  mongoose.set('bufferCommands', false)
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Fail fast when server is unavailable (helps tests avoid long timeouts)
      serverSelectionTimeoutMS: process.env.NODE_ENV === 'test' ? 2000 : undefined,
    })

    
  } catch (error) {
    
    process.exit(1)
  }
}

module.exports = connectDB
