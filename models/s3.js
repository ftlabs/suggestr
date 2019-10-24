const aws = require('aws-sdk');
const s3 = new aws.S3();

async function getFile(filename) {
	return s3
		.getObject({
			Bucket: process.env.AWS_BUCKET,
			Key: filename
		})
		.promise();
}

module.exports = {
	getFile
};
