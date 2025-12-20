require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')

async function updateUserAvatars() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI)
        

        // Find all users (update everyone to robot avatars)
        const allUsers = await User.find({})

        

        // Update each user with new robot avatar
        let updated = 0
        for (const user of allUsers) {
            const seed = user._id.toString()
            user.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
            await user.save()
            updated++
             with robot avatar`)
        }

        
        process.exit(0)
    } catch (error) {
        
        process.exit(1)
    }
}

updateUserAvatars()
