const aws = require('aws-sdk');

const s3 = new aws.S3({
	AccessKeyID: process.env.AWS_ACCESS_KEY_ID,
	SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

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
