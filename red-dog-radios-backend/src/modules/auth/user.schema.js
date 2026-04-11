const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginateV2 = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['agency', 'admin'], default: 'agency' },
    isActive: { type: Boolean, default: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    onboardingCompleted: { type: Boolean, default: false },
    settings: {
      notifications: {
        highFitAlerts: { type: Boolean, default: true },
        deadlineReminders: { type: Boolean, default: true },
        weeklySummary: { type: Boolean, default: true },
        alertUpdates: { type: Boolean, default: true },
        systemAlerts: { type: Boolean, default: false },
      },
      preferences: {
        language: { type: String, default: 'en' },
        country: { type: String, default: 'US' },
        timezone: { type: String, default: 'America/New_York' },
      },
      reportEmail: { type: String },
      apiKey: { type: String },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.plugin(mongoosePaginateV2);

module.exports = mongoose.model('User', userSchema);
