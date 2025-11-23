require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')

async function updateUserAvatars() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to MongoDB')

        // Find all users (update everyone to robot avatars)
        const allUsers = await User.find({})

        console.log(`Found ${allUsers.length} users to update with robot avatars`)

        // Update each user with new robot avatar
        let updated = 0
        for (const user of allUsers) {
            const seed = user._id.toString()
            user.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
            await user.save()
            updated++
            console.log(`Updated ${user.username} (${user.email}) with robot avatar`)
        }

        console.log(`\n✅ Successfully updated ${updated} users with robot avatars`)
        process.exit(0)
    } catch (error) {
        console.error('Error updating avatars:', error)
        process.exit(1)
    }
}

updateUserAvatars()
