const express = require('express');
const router = express.Router();
const suggestion = require('../module/suggestion');

router.get('/single/:topicName', async (req, res) => {
	const verbose = req.query.verbose ? req.query.verbose === 'true' : true;
	const result = await suggestion.topics(req.params.topicName, verbose);
	res.status(200).json(result);
	return;
});

router.get('/multiple/', async (req, res) => {
	const verbose = req.query.verbose ? req.query.verbose === 'true' : 'true';
	const topics = req.query.topics.split(',');
	const result = await suggestion.topics(topics, verbose);
	res.status(200).json(result);
	return;
});

module.exports = router;
