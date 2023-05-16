// Get current datetime
const now = new Date();

// Adjust to GMT+7
now.setHours(now.getHours() + 7);

// Format the datetime
const formattedDatetime = now.toISOString();

console.log(formattedDatetime);
