const aws = require('aws-sdk');

async function getFile(filename) {
	var s3 = new aws.S3({
		AccessKeyID: process.env.AWS_ACCESS_KEY_ID,
		SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	});
	var options = {
		Bucket: process.env.AWS_BUCKET,
		Key: filename
	};
	return s3.getObject(options).promise();
}

function getFiles() {
	return;
}

module.exports = {
	getFile,
	getFiles
};
