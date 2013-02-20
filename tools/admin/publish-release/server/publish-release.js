var amazon = AWSSum.load('amazon/amazon');
var S3 = AWSSum.load('amazon/s3', 'S3');

var gitSha = Meteor.settings["git-sha"];
if (!gitSha) {
  console.log("Run with --settings to set 'git-sha'");
  process.exit(1);
}

// Header are set to 'octet-stream' so the 'http' package doesn't
// detect this as JSON. Parse manually.
console.log(Meteor.http.get("http://packages.meteor.com/unpublished/" + gitSha + "/manifest.json").content);
process.exit();

/*
// run s3cmd --dump-config to get keys
var s3 = new S3({
  'accessKeyId' : accessKeyId,
  'secretAccessKey' : secretAccessKey,
  'region' : amazon.US_EAST_1
});

s3.GetObject
*/