const mongoose = require("mongoose")

const reportScheduleSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organisation",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reportType: {
      type: String,
      enum: ["Monthly Wellbeing Report", "Quarterly Workforce Stress Summary", "Intervention Impact Report", "Workforce Insights Report"],
      required: true,
    },

    frequency: {
      type: String,
      enum: ["monthly", "quarterly"],
      default: "monthly",
    },

    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    nextRunAt: {
      type: Date,
      default: () => {
        const nextMonth = new Date()
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        nextMonth.setDate(1)
        nextMonth.setHours(9, 0, 0, 0)
        return nextMonth
      },
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

reportScheduleSchema.index({ organisationId: 1, active: 1 })

module.exports = mongoose.model("ReportSchedule", reportScheduleSchema)
