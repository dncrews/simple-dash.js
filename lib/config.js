module.exports = {
  port : process.env.PORT || 5000,
  baseUrl : process.env.BASE_URL || 'localhost:' + port,
  bucketLength : 300000 // 5 minutes
};
