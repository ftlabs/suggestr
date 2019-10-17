const express = require('express');
const router = express.Router();
const suggestion = require('../module/suggestion');

router.get('/:topicName', async (req, res) => {
	const result = await suggestion.topics(req.params.topicName);
	res.status(200).json(result);
	return;
});

router.get('/', async (req, res) => {
	const topicsRequested = req.query.topics;
	const data = {
		type: 'Topic search - multiple',
		searchToken: topicsRequested,
		variables: {}
	};

	if (!topicsRequested) {
		data.error = 'Topic query parameter not defined';
		res.status(200).json(data);
		return;
	}

	const topics = req.query.topics.split(',');
	const topicPromises = [];
	topics.map((topic) => {
		new Promise(function(resolve, reject) {
			topicPromises.push(suggestion.topics(topic));
		});
	});

	Promise.all(topicPromises)
		.then((results) => {
			data.results = results;

			// also return combined results ordered by occurence (how many times it came up for seperate topics) and ratio

			const combined_sorted_topic_results = results
				.filter((entry) => {
					if (entry.variables.nonMatchingTopicsSorted) {
						return entry;
					}
				})
				.map((entry) => {
					return entry.variables.nonMatchingTopicsSorted;
				})
				.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));

			const mergedResults = [].concat.apply(
				[],
				combined_sorted_topic_results
			);

			data.nonMatchingTopicsSortedCombined = mergedResults;

			const nonMatchingTopicsSortedCombinedClean = mergedResults.map(
				(entry) => entry.concept_name
			);
			data.nonMatchingTopicsSortedCombinedClean = nonMatchingTopicsSortedCombinedClean;

			res.status(200).json(data);
			return;
		})
		.catch((error) => {
			data.error = error;
			res.status(200).json(data);
			return;
		});

	return;
});

module.exports = router;
