const mongoose = require("mongoose")
require("dotenv").config()

async function updateEmployeeIdIndex() {
  try {
    console.log("Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected.")

    const collection = mongoose.connection.collection("users")
    const indexes = await collection.indexes()
    console.log("Current indexes on users collection:")
    indexes.forEach((idx) => {
      console.log(`- ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? "(unique)" : "")
    })

    // Find existing employeeId index
    const oldIndex = indexes.find(
      (idx) => idx.name === "employeeId_1" || (idx.key && idx.key.employeeId)
    )

    if (oldIndex) {
      console.log(`Found existing employeeId index: "${oldIndex.name}". Dropping it...`)
      await collection.dropIndex(oldIndex.name)
      console.log(`Dropped index "${oldIndex.name}".`)
    } else {
      console.log("No existing employeeId index found.")
    }

    console.log("Creating partial unique index on { employeeId: 1 }...")
    const indexName = await collection.createIndex(
      { employeeId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          employeeId: { $type: "string" },
        },
      }
    )
    console.log(`Successfully created index: "${indexName}".`)

    const updatedIndexes = await collection.indexes()
    console.log("\nUpdated indexes on users collection:")
    updatedIndexes.forEach((idx) => {
      console.log(
        `- ${idx.name}:`,
        JSON.stringify(idx.key),
        idx.unique ? "(unique)" : "",
        idx.partialFilterExpression ? JSON.stringify(idx.partialFilterExpression) : ""
      )
    })

    await mongoose.disconnect()
    console.log("Disconnected. Done!")
  } catch (err) {
    console.error("Error updating index:", err)
    process.exit(1)
  }
}

updateEmployeeIdIndex()
