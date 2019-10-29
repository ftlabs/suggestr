const aws = require('aws-sdk');
const s3 = new aws.S3();

function getFile(filename) {
	return s3
		.getObject({
			Bucket: process.env.AWS_BUCKET,
			Key: filename
		})
		.promise()
		.catch((err) => {
			throw err;
		});
}

function getBodyAsJson(filename) {
	return getFile(filename)
		.then((datafile) => JSON.parse(datafile.Body.toString()))
		.catch((err) => {
			throw err.message;
		});
}

module.exports = {
	getBodyAsJson
};
