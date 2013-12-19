//TODO: we need to put the business rules in 1 central place as well...

module.exports = {
  apiSlowResTime: 1000,
  appSlowResTime: 5000,
  downErrRatio: 0.5,
  haWarningRatio: 0.15,
  haErrorRatio: 0.20,
  bucketLength : 300000, // 5 minutes
  detailsDayCount: 2 // How many days to show details for
};
