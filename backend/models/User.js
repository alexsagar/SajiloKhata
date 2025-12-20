const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: function() {
        // Username is required only if not using OAuth
        return !this.oauthProvider;
      },
      unique: true,
      sparse: true, // Allow multiple null values for OAuth users
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        // Password is required only if not using OAuth
        return !this.oauthProvider;
      },
      minlength: 6,
    },
    // OAuth fields
    oauthProvider: {
      type: String,
      enum: ["google", "facebook", null],
      default: null,
    },
    oauthProviderId: {
      type: String,
      default: null,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    phone: {
      type: String,
      default: null,
    },
    preferences: {
      currency: {
        type: String,
        default: "USD",
      },
      baseCurrency: {
        type: String,
        default: "USD",
        uppercase: true,
      },
      language: {
        type: String,
        default: "en",
      },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      timezone: {
        type: String,
        default: "America/New_York",
      },
      dateFormat: {
        type: String,
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        default: "MM/DD/YYYY",
      },
      autoSplit: {
        type: Boolean,
        default: true,
      },
      defaultSplitType: {
        type: String,
        enum: ["equal", "percentage", "exact"],
        default: "equal",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        whatsapp: {
          type: Boolean,
          default: false,
        },
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ["public", "friends", "private"],
          default: "friends",
        },
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Generate default avatar if not provided
userSchema.pre("save", async function (next) {
  // Only generate avatar for new users who don't have one
  if (this.isNew && !this.avatar) {
    // Use DiceBear API with user's ID as seed for consistent avatar
    // Using 'bottts' style for cute, gender-neutral robot avatars
    const seed = this._id.toString()
    this.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
  }
  next()
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject()
  delete userObject.password
  delete userObject.emailVerificationToken
  delete userObject.passwordResetToken
  delete userObject.passwordResetExpires
  return userObject
}

module.exports = mongoose.model("User", userSchema)
