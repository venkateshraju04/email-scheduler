const startTime = new Date();
startTime.setHours(10, 0, 0, 0);
console.log((startTime || undefined)?.toISOString() || new Date().toISOString());
